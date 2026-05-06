// src/utils/jwt.js
// Utilidades para generar y verificar JWT (access + refresh token)

const jwt = require("jsonwebtoken");

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || "medalert_access_secret_cambiame";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "medalert_refresh_secret_cambiame";

// Access token: caduca en 5 minutos (requerimiento del sistema)
const ACCESS_EXPIRES  = "5m";

// Refresh token: caduca en 7 días — permite renovar el access sin re-login
const REFRESH_EXPIRES = "7d";

/**
 * Genera el par de tokens para un usuario autenticado.
 * @param {{ id: number, rol: string }} payload
 * @returns {{ accessToken: string, refreshToken: string }}
 */
function generarTokens(payload) {
  const accessToken = jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  });

  const refreshToken = jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });

  return { accessToken, refreshToken };
}

/**
 * Verifica un access token.
 * Lanza JsonWebTokenError o TokenExpiredError si no es válido.
 * @param {string} token
 * @returns {object} payload decodificado
 */
function verificarAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/**
 * Verifica un refresh token.
 * @param {string} token
 * @returns {object} payload decodificado
 */
function verificarRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = { generarTokens, verificarAccessToken, verificarRefreshToken };