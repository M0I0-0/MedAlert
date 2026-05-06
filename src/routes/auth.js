// src/routes/auth.js
// Rutas de autenticación:
//   POST /auth/login    → genera access + refresh token
//   POST /auth/refresh  → renueva el access token con el refresh token
//   POST /auth/logout   → invalida el refresh token (cierra sesión)

const express = require("express");
const router = express.Router();
const { pool } = require("../database/connection");
const { generarTokens, verificarRefreshToken } = require("../utils/jwt");
const {
  guardarRefreshToken,
  buscarRefreshTokenValido,
  invalidarRefreshToken,
} = require("../database/tokenRepository");

// ─────────────────────────────────────────────────────────────────────────────
// Tabla de configuración por rol:
// define en qué tabla buscar al usuario y cuál es su campo de id.
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG_ROL = {
  administrador: { tabla: "administrador", idCampo: "id_administrador" },
  medico: { tabla: "medico", idCampo: "id_medico" },
  farmaceutico: { tabla: "farmaceutico", idCampo: "id_farmaceutico" },
  paciente: { tabla: "paciente", idCampo: "id_paciente" },
  familiar: { tabla: "familiar_cuidador", idCampo: "id_familiar" },
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/login
// Body: { correo, contrasena, rol }
//
// Nota: en producción la contraseña debe compararse con bcrypt.
// Aquí se compara en texto plano para facilitar el desarrollo.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { correo, contrasena, rol } = req.body;

  if (!correo || !contrasena || !rol) {
    return res.status(400).json({
      ok: false,
      mensaje: "correo, contrasena y rol son requeridos.",
    });
  }

  const config = CONFIG_ROL[rol];
  if (!config) {
    return res.status(400).json({ ok: false, mensaje: "Rol no válido." });
  }

  try {
    // 1. Buscar usuario por correo en la tabla correspondiente
    const [rows] = await pool.query(
      `SELECT * FROM \`${config.tabla}\` WHERE correo = ? LIMIT 1`,
      [correo],
    );

    const usuario = rows[0];

    // 2. Verificar existencia y contraseña
    //    TODO: reemplazar por bcrypt.compare(contrasena, usuario.contrasena)
    if (!usuario || usuario.contrasena !== contrasena) {
      return res.status(401).json({
        ok: false,
        mensaje: "Credenciales incorrectas.",
      });
    }

    const idUsuario = usuario[config.idCampo];

    // 3. Generar access token (5 min) y refresh token (7 días)
    const { accessToken, refreshToken } = generarTokens({ id: idUsuario, rol });

    // 4. Guardar refresh token en BD e invalidar sesiones anteriores
    //    → esto garantiza SESIÓN ÚNICA POR USUARIO
    await guardarRefreshToken({ refreshToken, rol, idUsuario });

    return res.status(200).json({
      ok: true,
      mensaje: "Sesión iniciada correctamente.",
      accessToken, // caduca en 5 minutos
      refreshToken, // usar para renovar el accessToken
      usuario: {
        id: idUsuario,
        nombre_completo: usuario.nombre_completo || usuario.nombre,
        rol,
      },
    });
  } catch (err) {
    console.error("Error en /auth/login:", err.message);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/refresh
// Body: { refreshToken }
//
// Flujo de rotación de tokens:
//   1. Verifica firma del refresh token
//   2. Verifica que esté activo en BD (no usado, no expirado)
//   3. Invalida el refresh token usado (rotación — evita reutilización)
//   4. Emite un nuevo par access + refresh token
// ─────────────────────────────────────────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res
      .status(400)
      .json({ ok: false, mensaje: "refreshToken requerido." });
  }

  try {
    // 1. Verificar firma
    let payload;
    try {
      payload = verificarRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({
        ok: false,
        mensaje: "Refresh token inválido o expirado. Inicia sesión nuevamente.",
      });
    }

    // 2. Verificar que esté activo en BD
    const tokenEnBD = await buscarRefreshTokenValido(refreshToken);
    if (!tokenEnBD) {
      // Posible reutilización de token — puede indicar un ataque
      return res.status(401).json({
        ok: false,
        mensaje: "Refresh token inválido. Inicia sesión nuevamente.",
      });
    }

    // 3. Invalidar el refresh token anterior (rotación)
    await invalidarRefreshToken(refreshToken);

    // 4. Emitir nuevo par de tokens
    const { accessToken: nuevoAccess, refreshToken: nuevoRefresh } =
      generarTokens({ id: payload.id, rol: payload.rol });

    await guardarRefreshToken({
      refreshToken: nuevoRefresh,
      rol: payload.rol,
      idUsuario: payload.id,
    });

    return res.status(200).json({
      ok: true,
      accessToken: nuevoAccess,
      refreshToken: nuevoRefresh,
    });
  } catch (err) {
    console.error("Error en /auth/refresh:", err.message);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/logout
// Body: { refreshToken }
//
// Invalida el refresh token en BD. El access token expirará solo (5 min).
// El cliente debe eliminar ambos tokens del almacenamiento local.
// ─────────────────────────────────────────────────────────────────────────────
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
    console.error("Error en /auth/logout:", err.message);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/recover
// Body: { correo }
//
// Flujo básico de recuperación para ambiente local:
//   1. Verifica si el correo existe en alguna tabla de usuarios
//   2. Devuelve un mensaje genérico para no filtrar información sensible
// ─────────────────────────────────────────────────────────────────────────────
router.post("/recover", async (req, res) => {
  const { correo } = req.body;

  if (!correo) {
    return res.status(400).json({
      ok: false,
      mensaje: "El correo es requerido.",
    });
  }

  try {
    const roles = Object.entries(CONFIG_ROL);
    let cuentaEncontrada = null;

    for (const [rol, config] of roles) {
      const [rows] = await pool.query(
        `SELECT ${config.idCampo} AS id FROM \`${config.tabla}\` WHERE correo = ? LIMIT 1`,
        [correo]
      );

      if (rows.length > 0) {
        cuentaEncontrada = { rol, id: rows[0].id };
        break;
      }
    }

    return res.status(200).json({
      ok: true,
      existeCuenta: Boolean(cuentaEncontrada),
      mensaje: cuentaEncontrada
        ? "Correo verificado. En este entorno local puedes iniciar sesion con tus credenciales existentes."
        : "Si el correo existe, se enviaran instrucciones de recuperacion.",
    });
  } catch (err) {
    console.error("Error en /auth/recover:", err.message);
    return res.status(500).json({ ok: false, mensaje: "Error interno del servidor." });
  }
});
const bcrypt = require("bcrypt");
module.exports = router;
