// src/routes/auth.js
const express = require("express");
const router = express.Router();

// Importamos el Middleware
const { autenticar, autorizar } = require("../middlewares/auth");

// Importamos el Controlador que acabamos de crear
const authController = require("../controllers/authController");

// ─────────────────────────────────────────────────────────────────────────────
// Rutas Públicas (No requieren Token)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/login", authController.login);
router.post("/signup", authController.signup);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.post("/forgot-password", authController.handleRecover);
router.post("/recover", authController.handleRecover);
router.post("/reset-password", authController.resetPassword);

// ─────────────────────────────────────────────────────────────────────────────
// Rutas Protegidas (Requieren Token y Rol Específico)
// ─────────────────────────────────────────────────────────────────────────────
// Registro de nuevos usuarios exclusivamente por el Administrador
router.post(
  "/register",
  autenticar,
  autorizar("administrador"),
  authController.registerAdminOnly,
);

module.exports = router;
