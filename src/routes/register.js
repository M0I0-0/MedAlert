// src/routes/register.js
// Registro de nuevos usuarios.
// IMPORTANTE: según los requerimientos, el administrador es el único que
// puede dar de alta usuarios. Por lo tanto, esta ruta está protegida con
// autenticación y autorización de administrador.
//
// POST /auth/register  → registra un nuevo usuario (requiere token de admin)

const express = require("express");
const router = express.Router();
const { pool } = require("../database/connection");
const { autenticar, autorizar } = require("../middlewares/auth");

let bcrypt = null;

try {
  bcrypt = require("bcrypt");
} catch {
  bcrypt = null;
}

const SALT_ROUNDS = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Validadores por rol
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valida que la contraseña del administrador cumpla las reglas:
 * 10-15 caracteres, al menos una mayúscula, una minúscula, un número y un símbolo.
 */
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
  if (contrasena.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }

  return null;
}

async function hashContrasenaSiEsPosible(contrasena) {
  if (!bcrypt) {
    return contrasena;
  }

  return bcrypt.hash(contrasena, SALT_ROUNDS);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/register
// Headers: Authorization: Bearer <accessToken de administrador>
// Body: { rol, ...campos según el rol }
//
// Roles soportados y sus campos:
//
//   administrador: { nombre, correo?, telefono?, contrasena }
//   medico:        { nombre_completo, cedula_profesional, especialidad, telefono?, correo?, contrasena }
//   farmaceutico:  { nombre_completo, cedula_profesional, telefono?, correo?, permiso_dispensar?, contrasena }
//   paciente:      { nombre_completo, edad, estatura_cm?, peso_kg?, telefono?, correo?,
//                    historial_clinico?, alergias?, id_medico, contrasena }
//   familiar:      { nombre_completo, edad?, telefono?, correo?, relacion_paciente, contrasena }
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/register",
  autenticar,
  autorizar("administrador"),
  async (req, res) => {
    const { rol, ...campos } = req.body;
    const idAdmin = req.usuario.id;

    if (!rol) {
      return res
        .status(400)
        .json({ ok: false, mensaje: "El campo 'rol' es requerido." });
    }

    try {
      let resultado;

      switch (rol) {
        // ── ADMINISTRADOR ──────────────────────────────────────────────────
        case "administrador": {
          const { nombre, correo, telefono, contrasena } = campos;

          if (!nombre)
            return res
              .status(400)
              .json({ ok: false, mensaje: "El nombre es requerido." });
          if (!correo && !telefono)
            return res.status(400).json({
              ok: false,
              mensaje: "Se requiere correo o teléfono.",
            });

          const errorContrasena = validarContrasenaAdmin(contrasena);
          if (errorContrasena)
            return res
              .status(400)
              .json({ ok: false, mensaje: errorContrasena });

          const hash = bcrypt
            ? await bcrypt.hash(contrasena, SALT_ROUNDS)
            : contrasena;

          const [result] = await pool.query(
            `INSERT INTO administrador (nombre, correo, telefono, contrasena)
             VALUES (?, ?, ?, ?)`,
            [nombre, correo || null, telefono || null, hash]
          );

          resultado = {
            id: result.insertId,
            nombre,
            correo: correo || null,
            rol: "administrador",
          };
          break;
        }

        // ── MÉDICO ────────────────────────────────────────────────────────
        case "medico": {
          const {
            nombre_completo,
            cedula_profesional,
            especialidad,
            telefono,
            correo,
            contrasena,
          } = campos;

          if (!nombre_completo || !cedula_profesional || !especialidad)
            return res.status(400).json({
              ok: false,
              mensaje: "nombre_completo, cedula_profesional y especialidad son requeridos.",
            });

          const errorContrasena = validarContrasenaUsuario(contrasena);
          if (errorContrasena) {
            return res.status(400).json({ ok: false, mensaje: errorContrasena });
          }

          const hash = await hashContrasenaSiEsPosible(contrasena);

          const [result] = await pool.query(
            `INSERT INTO medico (id_administrador, nombre_completo, cedula_profesional, especialidad, telefono, correo, contrasena)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [idAdmin, nombre_completo, cedula_profesional, especialidad, telefono || null, correo || null, hash]
          );

          resultado = {
            id: result.insertId,
            nombre_completo,
            cedula_profesional,
            rol: "medico",
          };
          break;
        }

        // ── FARMACÉUTICO ──────────────────────────────────────────────────
        case "farmaceutico": {
          const {
            nombre_completo,
            cedula_profesional,
            telefono,
            correo,
            permiso_dispensar,
            contrasena,
          } = campos;

          if (!nombre_completo || !cedula_profesional)
            return res.status(400).json({
              ok: false,
              mensaje: "nombre_completo y cedula_profesional son requeridos.",
            });

          const errorContrasena = validarContrasenaUsuario(contrasena);
          if (errorContrasena) {
            return res.status(400).json({ ok: false, mensaje: errorContrasena });
          }

          const hash = await hashContrasenaSiEsPosible(contrasena);

          const [result] = await pool.query(
            `INSERT INTO farmaceutico (id_administrador, nombre_completo, cedula_profesional, telefono, correo, permiso_dispensar, contrasena)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              idAdmin,
              nombre_completo,
              cedula_profesional,
              telefono || null,
              correo || null,
              permiso_dispensar ? 1 : 0,
              hash,
            ]
          );

          resultado = {
            id: result.insertId,
            nombre_completo,
            cedula_profesional,
            rol: "farmaceutico",
          };
          break;
        }

        // ── PACIENTE ──────────────────────────────────────────────────────
        case "paciente": {
          const {
            nombre_completo, edad, estatura_cm, peso_kg,
            telefono, correo, historial_clinico, alergias, id_medico, contrasena,
          } = campos;

          if (!nombre_completo || !edad || !id_medico)
            return res.status(400).json({
              ok: false,
              mensaje: "nombre_completo, edad e id_medico son requeridos.",
            });

          const errorContrasena = validarContrasenaUsuario(contrasena);
          if (errorContrasena) {
            return res.status(400).json({ ok: false, mensaje: errorContrasena });
          }

          const hash = await hashContrasenaSiEsPosible(contrasena);

          const [result] = await pool.query(
            `INSERT INTO paciente
               (id_medico, id_administrador, nombre_completo, edad, estatura_cm, peso_kg,
                telefono, correo, historial_clinico, alergias, contrasena)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id_medico, idAdmin, nombre_completo, edad,
              estatura_cm || null, peso_kg || null,
              telefono || null, correo || null,
              historial_clinico || null, alergias || null, hash,
            ]
          );

          resultado = {
            id: result.insertId,
            nombre_completo,
            rol: "paciente",
          };
          break;
        }

        // ── FAMILIAR / CUIDADOR ───────────────────────────────────────────
        case "familiar": {
          const {
            nombre_completo,
            edad,
            telefono,
            correo,
            relacion_paciente,
            contrasena,
          } = campos;

          if (!nombre_completo || !relacion_paciente)
            return res.status(400).json({
              ok: false,
              mensaje: "nombre_completo y relacion_paciente son requeridos.",
            });

          const errorContrasena = validarContrasenaUsuario(contrasena);
          if (errorContrasena) {
            return res.status(400).json({ ok: false, mensaje: errorContrasena });
          }

          const hash = await hashContrasenaSiEsPosible(contrasena);

          const [result] = await pool.query(
            `INSERT INTO familiar_cuidador
               (id_administrador, nombre_completo, edad, telefono, correo, relacion_paciente, contrasena)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              idAdmin, nombre_completo, edad || null,
              telefono || null, correo || null, relacion_paciente, hash,
            ]
          );

          resultado = {
            id: result.insertId,
            nombre_completo,
            rol: "familiar",
          };
          break;
        }

        default:
          return res.status(400).json({ ok: false, mensaje: "Rol no válido." });
      }

      return res.status(201).json({
        ok: true,
        mensaje: `Usuario con rol '${rol}' registrado correctamente.`,
        usuario: resultado,
      });
    } catch (err) {
      // Clave duplicada (correo o cédula ya registrada)
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          ok: false,
          mensaje: "Ya existe un registro con ese correo o cédula profesional.",
        });
      }

      console.error("Error en /auth/register:", err.message);
      return res
        .status(500)
        .json({ ok: false, mensaje: "Error interno del servidor." });
    }
  }
);

module.exports = router;
