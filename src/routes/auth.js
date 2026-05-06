require("dotenv").config();

const express = require("express");
const router = express.Router();
const { pool } = require("../database/connection");
const { generarTokens, verificarRefreshToken } = require("../utils/jwt");
const {
  guardarRefreshToken,
  buscarRefreshTokenValido,
  invalidarRefreshToken,
} = require("../database/tokenRepository");

const crypto = require("crypto");
let bcrypt = null;

try {
  bcrypt = require("bcrypt");
} catch {
  bcrypt = null;
}

const CONFIG_ROL = {
  administrador: { tabla: "administrador", idCampo: "id_administrador" },
  medico: { tabla: "medico", idCampo: "id_medico" },
  farmaceutico: { tabla: "farmaceutico", idCampo: "id_farmaceutico" },
  paciente: { tabla: "paciente", idCampo: "id_paciente" },
  familiar: { tabla: "familiar_cuidador", idCampo: "id_familiar" },
};

function hashContrasenaSiEsPosible(contrasena) {
  if (!bcrypt) {
    return Promise.resolve(contrasena);
  }

  return bcrypt.hash(contrasena, 10);
}

function validarContrasenaAdmin(contrasena) {
  if (!contrasena) return "La contraseña es requerida.";
  if (contrasena.length < 10 || contrasena.length > 15) {
    return "La contraseña debe tener entre 10 y 15 caracteres.";
  }
  if (!/[A-Z]/.test(contrasena)) {
    return "La contraseña debe incluir al menos una mayúscula.";
  }
  if (!/[a-z]/.test(contrasena)) {
    return "La contraseña debe incluir al menos una minúscula.";
  }
  if (!/[0-9]/.test(contrasena)) {
    return "La contraseña debe incluir al menos un número.";
  }
  if (!/[^A-Za-z0-9]/.test(contrasena)) {
    return "La contraseña debe incluir al menos un símbolo especial.";
  }

  return null;
}

function validarContrasenaUsuario(contrasena) {
  if (!contrasena) return "La contraseña es requerida.";
  if (contrasena.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }

  return null;
}

function validarContrasenaPorRol(rol, contrasena) {
  return rol === "administrador"
    ? validarContrasenaAdmin(contrasena)
    : validarContrasenaUsuario(contrasena);
}

async function obtenerAdministradorBase() {
  const [rows] = await pool.query(
    `SELECT id_administrador
       FROM administrador
      ORDER BY id_administrador ASC
      LIMIT 1`
  );

  return rows[0]?.id_administrador || null;
}

router.post("/signup", async (req, res) => {
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
    historial_clinico,
    alergias,
    id_medico,
    relacion_paciente,
  } = req.body;

  if (!rol) {
    return res.status(400).json({ ok: false, mensaje: "El rol es requerido." });
  }

  if (rol === "administrador") {
    return res.status(403).json({
      ok: false,
      mensaje: "El rol administrador no se puede registrar desde esta pantalla.",
    });
  }

  const config = CONFIG_ROL[rol];
  if (!config) {
    return res.status(400).json({ ok: false, mensaje: "Rol no válido." });
  }

  if (!nombre?.trim()) {
    return res.status(400).json({ ok: false, mensaje: "El nombre es requerido." });
  }

  if (!correo?.trim()) {
    return res.status(400).json({
      ok: false,
      mensaje: "El correo es requerido para el registro.",
    });
  }

  const errorContrasena = validarContrasenaUsuario(contrasena);
  if (errorContrasena) {
    return res.status(400).json({ ok: false, mensaje: errorContrasena });
  }

  try {
    const administradorBase = await obtenerAdministradorBase();
    if (!administradorBase) {
      return res.status(400).json({
        ok: false,
        mensaje: "Primero debe existir al menos un administrador en el sistema.",
      });
    }

    const [correoExistente] = await pool.query(
      `SELECT ${config.idCampo}
         FROM \`${config.tabla}\`
        WHERE correo = ?
        LIMIT 1`,
      [correo]
    );

    if (correoExistente.length > 0) {
      return res.status(409).json({
        ok: false,
        mensaje: "Ya existe una cuenta con ese correo.",
      });
    }

    const hash = await hashContrasenaSiEsPosible(contrasena);
    let result;

    switch (rol) {
      case "medico":
        if (!cedula_profesional?.trim() || !especialidad?.trim()) {
          return res.status(400).json({
            ok: false,
            mensaje: "La cédula profesional y la especialidad son requeridas.",
          });
        }

        [result] = await pool.query(
          `INSERT INTO medico
             (id_administrador, nombre_completo, cedula_profesional, especialidad, telefono, correo, contrasena)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            administradorBase,
            nombre.trim(),
            cedula_profesional.trim(),
            especialidad.trim(),
            telefono || null,
            correo.trim(),
            hash,
          ]
        );
        break;

      case "farmaceutico":
        if (!cedula_profesional?.trim()) {
          return res.status(400).json({
            ok: false,
            mensaje: "La cédula profesional es requerida.",
          });
        }

        [result] = await pool.query(
          `INSERT INTO farmaceutico
             (id_administrador, nombre_completo, cedula_profesional, telefono, correo, permiso_dispensar, contrasena)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            administradorBase,
            nombre.trim(),
            cedula_profesional.trim(),
            telefono || null,
            correo.trim(),
            permiso_dispensar ? 1 : 0,
            hash,
          ]
        );
        break;

      case "paciente":
        if (!edad || !id_medico) {
          return res.status(400).json({
            ok: false,
            mensaje: "La edad y el médico tratante son requeridos.",
          });
        }

        [result] = await pool.query(
          `INSERT INTO paciente
             (id_medico, id_administrador, nombre_completo, edad, estatura_cm, peso_kg, telefono, correo, historial_clinico, alergias, contrasena)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            Number(id_medico),
            administradorBase,
            nombre.trim(),
            Number(edad),
            estatura_cm || null,
            peso_kg || null,
            telefono || null,
            correo.trim(),
            historial_clinico || null,
            alergias || null,
            hash,
          ]
        );
        break;

      case "familiar":
        if (!relacion_paciente?.trim()) {
          return res.status(400).json({
            ok: false,
            mensaje: "La relación con el paciente es requerida.",
          });
        }

        [result] = await pool.query(
          `INSERT INTO familiar_cuidador
             (id_administrador, nombre_completo, edad, telefono, correo, relacion_paciente, contrasena)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            administradorBase,
            nombre.trim(),
            edad || null,
            telefono || null,
            correo.trim(),
            relacion_paciente.trim(),
            hash,
          ]
        );
        break;

      default:
        return res.status(400).json({ ok: false, mensaje: "Rol no válido." });
    }

    return res.status(201).json({
      ok: true,
      mensaje: "Cuenta creada correctamente.",
      usuario: {
        id: result.insertId,
        nombre_completo: nombre.trim(),
        correo: correo.trim(),
        rol,
      },
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        ok: false,
        mensaje: "Ya existe un registro con ese correo o cédula.",
      });
    }

    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        ok: false,
        mensaje: "El médico indicado no existe o no está disponible.",
      });
    }

    console.error("Error en /auth/signup:", err.message);
    return res.status(500).json({ ok: false, mensaje: "Error interno del servidor." });
  }
});

router.post("/login", async (req, res) => {
  const { correo, contrasena, rol } = req.body;

  if (!correo || !contrasena || !rol) {
    return res
      .status(400)
      .json({ ok: false, mensaje: "correo, contrasena y rol son requeridos." });
  }

  const config = CONFIG_ROL[rol];
  if (!config) {
    return res.status(400).json({ ok: false, mensaje: "Rol no válido." });
  }

  try {
    const [rows] = await pool.query(
      `SELECT * FROM \`${config.tabla}\` WHERE correo = ? LIMIT 1`,
      [correo],
    );

    const usuario = rows[0];

    if (!usuario) {
      return res
        .status(401)
        .json({ ok: false, mensaje: "Credenciales incorrectas." });
    }

    const passwordGuardada = usuario.contrasena || "";
    const pareceHashBcrypt = passwordGuardada.startsWith("$2");
    const match = pareceHashBcrypt
      ? Boolean(bcrypt) && (await bcrypt.compare(contrasena, passwordGuardada))
      : contrasena === passwordGuardada;
    if (!match) {
      return res
        .status(401)
        .json({ ok: false, mensaje: "Credenciales incorrectas." });
    }

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
    console.error(err.message);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res
      .status(400)
      .json({ ok: false, mensaje: "refreshToken requerido." });
  }

  try {
    let payload;
    try {
      payload = verificarRefreshToken(refreshToken);
    } catch {
      return res
        .status(401)
        .json({ ok: false, mensaje: "Refresh token inválido o expirado." });
    }

    const tokenEnBD = await buscarRefreshTokenValido(refreshToken);
    if (!tokenEnBD) {
      return res
        .status(401)
        .json({ ok: false, mensaje: "Refresh token inválido." });
    }

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
    console.error(err.message);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
});

router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res
      .status(400)
      .json({ ok: false, mensaje: "refreshToken requerido." });
  }

  try {
    await invalidarRefreshToken(refreshToken);
    return res
      .status(200)
      .json({ ok: true, mensaje: "Sesión cerrada correctamente." });
  } catch (err) {
    console.error(err.message);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
});

async function handleRecover(req, res) {
  const { correo } = req.body;

  if (!correo) {
    return res
      .status(400)
      .json({ ok: false, mensaje: "El correo es requerido." });
  }

  try {
    let rolEncontrado = null;
    let usuarioEncontrado = false;

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
        existeCuenta: false,
        mensaje: "Si el correo existe, se enviaran instrucciones de recuperacion.",
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

    const link = `http://localhost:3000/pages/reset.html?token=${token}&correo=${correo}&rol=${rolEncontrado}`;

    return res.json({
      ok: true,
      existeCuenta: true,
      mensaje: "Correo verificado. En este entorno local puedes usar el enlace de recuperacion generado.",
      linkRecuperacion: link,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
}

router.post("/forgot-password", handleRecover);
router.post("/recover", handleRecover);

router.post("/reset-password", async (req, res) => {
  const { token, correo, rol, nuevaContrasena } = req.body;

  const config = CONFIG_ROL[rol];
  if (!config) {
    return res.status(400).json({ ok: false, mensaje: "Rol no válido." });
  }

  try {
    const [rows] = await pool.query(
      `SELECT * FROM password_resets WHERE token = ? AND correo = ? AND usado = FALSE`,
      [token, correo],
    );

    if (rows.length === 0) {
      return res.status(400).json({ ok: false, mensaje: "Token inválido." });
    }

    const reset = rows[0];

    if (new Date() > new Date(reset.expiracion)) {
      return res.status(400).json({ ok: false, mensaje: "Token expirado." });
    }

    const errorContrasena = validarContrasenaPorRol(rol, nuevaContrasena);
    if (errorContrasena) {
      return res.status(400).json({ ok: false, mensaje: errorContrasena });
    }

    const hash = await hashContrasenaSiEsPosible(nuevaContrasena);

    await pool.query(
      `UPDATE \`${config.tabla}\` SET contrasena = ? WHERE correo = ?`,
      [hash, correo],
    );

    await pool.query(`UPDATE password_resets SET usado = TRUE WHERE id = ?`, [
      reset.id,
    ]);

    res.json({ ok: true, mensaje: "Contraseña actualizada." });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

module.exports = router;
