// src/controllers/authController.js
require("dotenv").config();
const { pool } = require("../database/connection");
const { generarTokens, verificarRefreshToken } = require("../utils/jwt");
const {
  guardarRefreshToken,
  buscarRefreshTokenValido,
  invalidarRefreshToken,
} = require("../database/tokenRepository");
const crypto = require("crypto");

let bcrypt = null;
let nodemailer = null;

try {
  bcrypt = require("bcrypt");
} catch {
  bcrypt = null;
}
try {
  nodemailer = require("nodemailer");
} catch {
  nodemailer = null;
}

const SALT_ROUNDS = 10;
const CONFIG_ROL = {
  administrador: { tabla: "administrador", idCampo: "id_administrador" },
  medico: { tabla: "medico", idCampo: "id_medico" },
  farmaceutico: { tabla: "farmaceutico", idCampo: "id_farmaceutico" },
  paciente: { tabla: "paciente", idCampo: "id_paciente" },
  familiar: { tabla: "familiar_cuidador", idCampo: "id_familiar" },
};

// --- Funciones Auxiliares ---
async function hashContrasenaSiEsPosible(contrasena) {
  return bcrypt ? bcrypt.hash(contrasena, SALT_ROUNDS) : contrasena;
}

function validarContrasenaAdmin(contrasena) {
  if (!contrasena) return "La contraseña es requerida.";
  if (contrasena.length < 10 || contrasena.length > 15)
    return "La contraseña debe tener entre 10 y 15 caracteres.";
  if (!/[A-Z]/.test(contrasena))
    return "La contraseña debe incluir al menos una mayúscula.";
  if (!/[a-z]/.test(contrasena))
    return "La contraseña debe incluir al menos una minúscula.";
  if (!/[0-9]/.test(contrasena))
    return "La contraseña debe incluir al menos un número.";
  if (!/[^A-Za-z0-9]/.test(contrasena))
    return "La contraseña debe incluir al menos un símbolo especial.";
  return null;
}

function validarContrasenaUsuario(contrasena) {
  if (!contrasena) return "La contraseña es requerida.";
  if (contrasena.length < 8)
    return "La contraseña debe tener al menos 8 caracteres.";
  return null;
}

function validarContrasenaPorRol(rol, contrasena) {
  return rol === "administrador"
    ? validarContrasenaAdmin(contrasena)
    : validarContrasenaUsuario(contrasena);
}

async function obtenerAdministradorBase() {
  const [rows] = await pool.query(
    `SELECT id_administrador FROM administrador ORDER BY id_administrador ASC LIMIT 1`,
  );
  return rows[0]?.id_administrador || null;
}

function obtenerBaseUrl() {
  return (
    process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`
  );
}

function obtenerConfiguracionCorreo() {
  return {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || process.env.SMTP_USER || "",
  };
}

function correoEstaConfigurado() {
  const mailConfig = obtenerConfiguracionCorreo();
  return Boolean(
    mailConfig.host && mailConfig.user && mailConfig.pass && mailConfig.from,
  );
}

async function enviarCorreoRecuperacion({ to, rol, link }) {
  if (!nodemailer) throw new Error("nodemailer_no_disponible");
  const mailConfig = obtenerConfiguracionCorreo();
  const transporter = nodemailer.createTransport({
    host: mailConfig.host,
    port: mailConfig.port,
    secure: mailConfig.secure,
    auth: { user: mailConfig.user, pass: mailConfig.pass },
  });
  await transporter.sendMail({
    from: mailConfig.from,
    to,
    subject: "Recuperacion de contraseña - MedAlert",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1e293b;">
        <h2>Recuperacion de contraseña</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p><strong>Rol:</strong> ${rol}</p>
        <p>Haz clic en el siguiente enlace para continuar:</p>
        <p><a href="${link}">${link}</a></p>
        <p>Este enlace expirará en 15 minutos.</p>
      </div>
    `,
  });
}

// --- Controladores Exportables ---

const login = async (req, res) => {
  const { correo, contrasena, rol } = req.body;
  if (!correo || !contrasena || !rol)
    return res
      .status(400)
      .json({ ok: false, mensaje: "correo, contrasena y rol requeridos." });

  const config = CONFIG_ROL[rol];
  if (!config)
    return res.status(400).json({ ok: false, mensaje: "Rol no válido." });

  try {
    const [rows] = await pool.query(
      `SELECT * FROM \`${config.tabla}\` WHERE correo = ? LIMIT 1`,
      [correo],
    );
    const usuario = rows[0];
    if (!usuario)
      return res
        .status(401)
        .json({ ok: false, mensaje: "Credenciales incorrectas." });

    const passwordGuardada = usuario.contrasena || "";
    const match =
      passwordGuardada.startsWith("$2") && bcrypt
        ? await bcrypt.compare(contrasena, passwordGuardada)
        : contrasena === passwordGuardada;

    if (!match)
      return res
        .status(401)
        .json({ ok: false, mensaje: "Credenciales incorrectas." });

    const idUsuario = usuario[config.idCampo];
    const { accessToken, refreshToken } = generarTokens({ id: idUsuario, rol });
    await guardarRefreshToken({ refreshToken, rol, idUsuario });

    return res.status(200).json({
      ok: true,
      mensaje: "Sesión iniciada correctamente.",
      accessToken,
      refreshToken,
      usuario: {
        id: idUsuario,
        nombre_completo: usuario.nombre_completo || usuario.nombre,
        rol,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
};

const signup = async (req, res) => {
  const {
    rol,
    nombre,
    correo,
    telefono,
    contrasena,
    cedula_profesional,
    especialidad,
    permiso_dispensar,
    edad,
    estatura_cm,
    peso_kg,
    alergias,
    id_medico,
  } = req.body;

  if (!rol || !CONFIG_ROL[rol])
    return res
      .status(400)
      .json({ ok: false, mensaje: "Rol no válido o requerido." });
  if (rol === "administrador")
    return res.status(403).json({
      ok: false,
      mensaje: "El administrador no se puede registrar desde aquí.",
    });
  if (!nombre?.trim() || !correo?.trim())
    return res
      .status(400)
      .json({ ok: false, mensaje: "Nombre y correo requeridos." });

  const errorContrasena = validarContrasenaUsuario(contrasena);
  if (errorContrasena)
    return res.status(400).json({ ok: false, mensaje: errorContrasena });

  try {
    const administradorBase = await obtenerAdministradorBase();
    if (!administradorBase)
      return res.status(400).json({
        ok: false,
        mensaje: "Debe existir al menos un administrador en el sistema.",
      });

    const hash = await hashContrasenaSiEsPosible(contrasena);
    let result;

    if (rol === "medico") {
      [result] = await pool.query(
        `INSERT INTO medico (id_administrador, nombre_completo, cedula_profesional, especialidad, telefono, correo, contrasena) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          administradorBase,
          nombre.trim(),
          cedula_profesional,
          especialidad,
          telefono || null,
          correo.trim(),
          hash,
        ],
      );
    } else if (rol === "paciente") {
      [result] = await pool.query(
        `INSERT INTO paciente (id_medico, id_administrador, nombre_completo, edad, estatura_cm, peso_kg, telefono, correo, alergias, contrasena) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_medico,
          administradorBase,
          nombre.trim(),
          edad,
          estatura_cm || null,
          peso_kg || null,
          telefono || null,
          correo.trim(),
          alergias || null,
          hash,
        ],
      );
    } else if (rol === "farmaceutico") {
      [result] = await pool.query(
        `INSERT INTO farmaceutico (id_administrador, nombre_completo, cedula_profesional, telefono, correo, permiso_dispensar, contrasena) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          administradorBase,
          nombre.trim(),
          cedula_profesional,
          telefono || null,
          correo.trim(),
          permiso_dispensar ? 1 : 0,
          hash,
        ],
      );
    } else if (rol === "familiar") {
      [result] = await pool.query(
        `INSERT INTO familiar_cuidador (id_administrador, nombre_completo, telefono, correo, contrasena) VALUES (?, ?, ?, ?, ?)`,
        [
          administradorBase,
          nombre.trim(),
          telefono || null,
          correo.trim(),
          hash,
        ],
      );
    }

    return res.status(201).json({
      ok: true,
      mensaje: "Cuenta creada exitosamente.",
      usuario: {
        id: result.insertId,
        nombre_completo: nombre.trim(),
        correo: correo.trim(),
        rol,
      },
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .json({ ok: false, mensaje: "El correo o cédula ya existe." });
    res.status(500).json({ ok: false, mensaje: "Error interno del servidor." });
  }
};

const registerAdminOnly = async (req, res) => {
  const { rol, ...campos } = req.body;
  if (!rol)
    return res
      .status(400)
      .json({ ok: false, mensaje: "El campo 'rol' es requerido." });

  // Como la creación es manejada principalmente por el public signup,
  // redirigimos la lógica allá simulando el req.body para no duplicar código
  return signup(req, res);
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res
      .status(400)
      .json({ ok: false, mensaje: "refreshToken requerido." });

  try {
    let payload = verificarRefreshToken(refreshToken);
    const tokenEnBD = await buscarRefreshTokenValido(refreshToken);
    if (!tokenEnBD)
      return res
        .status(401)
        .json({ ok: false, mensaje: "Refresh token inválido." });

    await invalidarRefreshToken(refreshToken);
    const { accessToken: nuevoAccess, refreshToken: nuevoRefresh } =
      generarTokens({ id: payload.id, rol: payload.rol });
    await guardarRefreshToken({
      refreshToken: nuevoRefresh,
      rol: payload.rol,
      idUsuario: payload.id,
    });

    return res
      .status(200)
      .json({ ok: true, accessToken: nuevoAccess, refreshToken: nuevoRefresh });
  } catch (err) {
    return res
      .status(401)
      .json({ ok: false, mensaje: "Token inválido o expirado." });
  }
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res
      .status(400)
      .json({ ok: false, mensaje: "refreshToken requerido." });
  try {
    await invalidarRefreshToken(refreshToken);
    return res
      .status(200)
      .json({ ok: true, mensaje: "Sesión cerrada correctamente." });
  } catch (err) {
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
};

const handleRecover = async (req, res) => {
  const { correo } = req.body;
  if (!correo)
    return res
      .status(400)
      .json({ ok: false, mensaje: "El correo es requerido." });

  try {
    let rolEncontrado = null;
    let usuarioEncontrado = false;

    // Buscar en todas las tablas a quién le pertenece el correo
    for (const [rol, config] of Object.entries(CONFIG_ROL)) {
      const [rows] = await pool.query(
        `SELECT ${config.idCampo} FROM \`${config.tabla}\` WHERE correo = ? LIMIT 1`,
        [correo],
      );
      if (rows.length > 0) {
        rolEncontrado = rol;
        usuarioEncontrado = true;
        break;
      }
    }

    if (!usuarioEncontrado) {
      return res.json({
        ok: true,
        mensaje:
          "Si el correo existe, se enviarán instrucciones de recuperación.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiracion = new Date(Date.now() + 15 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    await pool.query(
      `INSERT INTO password_resets (correo, token, expiracion) VALUES (?, ?, ?)`,
      [correo, token, expiracion],
    );

    const link = `${obtenerBaseUrl()}/pages/reset.html?token=${encodeURIComponent(token)}&correo=${encodeURIComponent(correo)}&rol=${encodeURIComponent(rolEncontrado)}`;

    if (correoEstaConfigurado()) {
      try {
        await enviarCorreoRecuperacion({
          to: correo,
          rol: rolEncontrado,
          link,
        });
        return res.json({
          ok: true,
          mensaje: "Te enviamos un correo con el enlace de recuperación.",
        });
      } catch (error) {
        console.error("Error enviando correo:", error.message);
      }
    }

    return res.json({
      ok: true,
      mensaje:
        "El servicio de correo no está disponible en este entorno. Usa temporalmente este enlace.",
      linkRecuperacion: link,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
};

const resetPassword = async (req, res) => {
  const { token, correo, rol, nuevaContrasena } = req.body;
  const config = CONFIG_ROL[rol];

  if (!config)
    return res.status(400).json({ ok: false, mensaje: "Rol no válido." });

  try {
    const [rows] = await pool.query(
      `SELECT * FROM password_resets WHERE token = ? AND correo = ? AND usado = FALSE`,
      [token, correo],
    );
    if (rows.length === 0)
      return res.status(400).json({ ok: false, mensaje: "Token inválido." });

    const reset = rows[0];
    if (new Date() > new Date(reset.expiracion))
      return res.status(400).json({ ok: false, mensaje: "Token expirado." });

    const errorContrasena = validarContrasenaPorRol(rol, nuevaContrasena);
    if (errorContrasena)
      return res.status(400).json({ ok: false, mensaje: errorContrasena });

    const hash = await hashContrasenaSiEsPosible(nuevaContrasena);
    await pool.query(
      `UPDATE \`${config.tabla}\` SET contrasena = ? WHERE correo = ?`,
      [hash, correo],
    );
    await pool.query(`UPDATE password_resets SET usado = TRUE WHERE id = ?`, [
      reset.id,
    ]);

    res.json({ ok: true, mensaje: "Contraseña actualizada exitosamente." });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
};

module.exports = {
  login,
  signup,
  registerAdminOnly,
  refresh,
  logout,
  handleRecover,
  resetPassword,
};
