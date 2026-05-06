// src/middlewares/auth.js
// Middleware para proteger rutas verificando el access token JWT.
//
// USO:
//   const { autenticar, autorizar } = require('../middlewares/auth');
//
//   router.get('/ruta', autenticar, handler);
//   router.get('/admin', autenticar, autorizar('administrador'), handler);

const { verificarAccessToken } = require("../utils/jwt");

/**
 * Verifica que el request tenga un access token válido en el header:
 *   Authorization: Bearer <accessToken>
 *
 * Si es válido, agrega req.usuario con { id, rol } para usarlo en los handlers.
 */
function autenticar(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      ok: false,
      mensaje: "Token de acceso requerido.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verificarAccessToken(token);
    req.usuario = { id: payload.id, rol: payload.rol };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        ok: false,
        codigo: "TOKEN_EXPIRADO",
        mensaje: "El token ha expirado. Usa el refresh token para renovarlo.",
      });
    }
    return res.status(401).json({
      ok: false,
      mensaje: "Token inválido.",
    });
  }
}

/**
 * Fábrica de middleware para restringir acceso por rol.
 * Se usa DESPUÉS de autenticar.
 *
 * @param {...string} roles - roles permitidos, ej: autorizar('administrador', 'medico')
 */
function autorizar(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario?.rol)) {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permiso para acceder a este recurso.",
      });
    }
    next();
  };
}

module.exports = { autenticar, autorizar };