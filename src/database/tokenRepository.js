// src/database/tokenRepository.js
// Operaciones de BD para gestionar refresh tokens y sesión única por usuario.
//
// SESIÓN ÚNICA: al guardar un nuevo token se invalidan todos los anteriores
// del mismo usuario/rol, garantizando que solo exista UNA sesión activa.

const { pool } = require("./connection");

/**
 * Guarda un refresh token e invalida los anteriores del mismo usuario.
 * Esto implementa la restricción de "sesión activa única por usuario".
 *
 * @param {object} params
 * @param {string} params.refreshToken  - el refresh token a guardar
 * @param {string} params.rol           - rol del usuario
 * @param {number} params.idUsuario     - id del usuario en su tabla
 */
async function guardarRefreshToken({ refreshToken, rol, idUsuario }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Invalidar TODOS los tokens activos anteriores del usuario
    //    → sesión única: no puede haber dos sesiones simultáneas
    await conn.query(
      `UPDATE token_sesion
          SET usado = 1
        WHERE id_usuario = ? AND rol = ? AND usado = 0`,
      [idUsuario, rol]
    );

    // 2. Calcular fecha de expiración del refresh token (7 días)
    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 3. Insertar el nuevo refresh token
    await conn.query(
      `INSERT INTO token_sesion (token, rol, id_usuario, expira_en, usado)
       VALUES (?, ?, ?, ?, 0)`,
      [refreshToken, rol, idUsuario, expiraEn]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Verifica si un refresh token existe en BD, no ha sido usado y no expiró.
 * @param {string} refreshToken
 * @returns {object|null} fila del token o null si no es válido
 */
async function buscarRefreshTokenValido(refreshToken) {
  const [rows] = await pool.query(
    `SELECT * FROM token_sesion
      WHERE token     = ?
        AND usado     = 0
        AND expira_en > NOW()
      LIMIT 1`,
    [refreshToken]
  );
  return rows[0] || null;
}

/**
 * Invalida (marca como usado) un refresh token específico.
 * Se llama al hacer logout o al rotar el token en /refresh.
 * @param {string} refreshToken
 */
async function invalidarRefreshToken(refreshToken) {
  await pool.query(
    `UPDATE token_sesion SET usado = 1 WHERE token = ?`,
    [refreshToken]
  );
}

/**
 * Invalida TODOS los refresh tokens activos de un usuario.
 * Útil para "cerrar todas las sesiones" o al detectar uso sospechoso.
 * @param {number} idUsuario
 * @param {string} rol
 */
async function invalidarTodosLosTokens(idUsuario, rol) {
  await pool.query(
    `UPDATE token_sesion SET usado = 1
      WHERE id_usuario = ? AND rol = ? AND usado = 0`,
    [idUsuario, rol]
  );
}

module.exports = {
  guardarRefreshToken,
  buscarRefreshTokenValido,
  invalidarRefreshToken,
  invalidarTodosLosTokens,
};