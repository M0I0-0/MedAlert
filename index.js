// index.js  –  Punto de entrada de la aplicación
require("dotenv").config();

const express = require("express");
const path = require("path");
const { testConnection } = require("./src/database/connection");

// ─── Importación de Rutas ─────────────────────────────────────────────────────
const authRouter = require("./src/routes/auth");
const medicamentosRouter = require("./src/routes/medicamentos"); // El nuevo router médico

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares globales ─────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ─── Rutas ────────────────────────────────────────────────────────────────────
// Toda la autenticación (login, signup, register admin, refresh) pasa por aquí
app.use("/auth", authRouter);

// Módulo de telemedicina e interacciones (rutas protegidas)
app.use("/api/medicamentos", medicamentosRouter);

// ─── Ruta base ────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "index.html"));
});

app.get("/doctor", (_req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "pages", "interfazDoctor.html"),
  );
});

app.get("/paciente", (_req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "pages", "interfazpaciente.html"),
  );
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
async function main() {
  await testConnection();

  app.listen(PORT, () => {
    console.log(`🌐 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📋 Entorno: ${process.env.NODE_ENV || "development"}`);

    console.log(`\n🔑 Endpoints de Autenticación (/auth):`);
    console.log(`  POST /auth/login         → Iniciar sesión`);
    console.log(`  POST /auth/signup        → Registro público`);
    console.log(`  POST /auth/register      → Registrar usuario (Solo Admin)`);
    console.log(`  POST /auth/refresh       → Renovar access token`);
    console.log(`  POST /auth/logout        → Cerrar sesión`);

    console.log(`\n💊 Endpoints de Medicamentos (/api/medicamentos):`);
    console.log(
      `  POST /api/medicamentos/prescribir    → Recetar con filtro de interacciones (Solo Médico)`,
    );
    console.log(
      `  GET  /api/medicamentos/paciente/:id  → Ver historial activo`,
    );

    console.log(`\n🛠️ Comandos disponibles:`);
    console.log(`  npm run dev      → servidor con auto-reload`);
    console.log(`  npm run migrate  → crear tablas en la BD`);
    console.log(`  npm run seed     → insertar datos de prueba`);
  });
}

main();
