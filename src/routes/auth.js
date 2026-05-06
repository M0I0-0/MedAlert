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

    const link = `http://localhost:3000/reset.html?token=${token}&correo=${correo}&rol=${rolEncontrado}`;

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

    if (!bcrypt) {
      return res.status(500).json({
        ok: false,
        mensaje: "La recuperacion con hash no esta disponible en este entorno.",
      });
    }

    const hash = await bcrypt.hash(nuevaContrasena, 10);

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
