// index.js  –  Punto de entrada de la aplicación
require("dotenv").config();

const express = require("express");
const path = require("path");
const { testConnection } = require("./src/database/connection");
const authRouter = require("./src/routes/auth");
const registerRouter = require("./src/routes/register");

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares globales ─────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ─── Rutas públicas ───────────────────────────────────────────────────────────
app.use("/auth", authRouter);
app.use("/auth", registerRouter);

// ─── Ruta base ────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "index.html"));
});

// ─── Ejemplo de ruta protegida ────────────────────────────────────────────────
// const { autenticar, autorizar } = require('./src/middlewares/auth');
//
// app.get('/api/pacientes', autenticar, async (req, res) => {
//   res.json({ ok: true, usuario: req.usuario });
// });
//
// app.get('/api/admin/usuarios', autenticar, autorizar('administrador'), async (req, res) => {
//   res.json({ ok: true, mensaje: 'Solo admins llegan aquí' });
// });

// ─── Arranque ─────────────────────────────────────────────────────────────────
async function main() {
  await testConnection();

  app.listen(PORT, () => {
    console.log(`🌐 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📋 Entorno: ${process.env.NODE_ENV || "development"}`);
    console.log(`\nEndpoints de autenticación:`);
    console.log(`  POST /auth/login      → iniciar sesión`);
    console.log(`  POST /auth/refresh    → renovar access token`);
    console.log(`  POST /auth/logout     → cerrar sesión`);
    console.log(`  POST /auth/register   → registrar usuario (solo admin)`);
    console.log(`\nComandos disponibles:`);
    console.log(`  npm run dev      → servidor con auto-reload`);
    console.log(`  npm run migrate  → crear tablas en la BD`);
    console.log(`  npm run seed     → insertar datos de prueba`);
  });
}

main();