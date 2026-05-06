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

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

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

    const match = await bcrypt.compare(contrasena, usuario.contrasena);
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

router.post("/forgot-password", async (req, res) => {
  const { correo } = req.body;

  if (!correo) {
    return res
      .status(400)
      .json({ ok: false, mensaje: "El correo es requerido." });
  }

  try {
    let rolEncontrado = null;

    for (const [rol, config] of Object.entries(CONFIG_ROL)) {
      const [rows] = await pool.query(
        `SELECT ${config.idCampo} FROM \`${config.tabla}\` WHERE correo = ? LIMIT 1`,
        [correo],
      );
      if (rows.length > 0) {
        rolEncontrado = rol;
        break;
      }
    }

    if (!rolEncontrado) {
      return res.json({
        ok: true,
        mensaje: "Si el correo existe, se enviarán instrucciones.",
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

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "medalert12345@gmail.com",
        pass: "gpdy mxxp cwva jopj",
      },
    });

    const link = `http://localhost:3000/reset.html?token=${token}&correo=${correo}&rol=${rolEncontrado}`;

    await transporter.sendMail({
      from: "medalert12345@gmail.com",
      to: correo,
      subject: "Recuperación de contraseña",
      html: `<a href="${link}">Restablecer contraseña</a>`,
    });

    res.json({ ok: true, mensaje: "Correo enviado." });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

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
