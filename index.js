// index.js  –  Punto de entrada de la aplicación
require("dotenv").config();

const http = require("http");
const { testConnection } = require("./src/database/connection");

const PORT = process.env.PORT || 3000;

// ─── Servidor HTTP básico ─────────────────────────────────────────────────────
// Aquí puedes montar Express u otro framework cuando lo necesites.
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "ok",
      message: "API de Recordatorios de Medicamentos funcionando 🚀",
      version: "1.0.0",
    })
  );
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
async function main() {
  // 1. Verificar conexión a la base de datos antes de abrir el puerto
  await testConnection();

  // 2. Iniciar el servidor
  server.listen(PORT, () => {
    console.log(`🌐 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📋 Entorno: ${process.env.NODE_ENV || "development"}`);
    console.log(`\nComandos disponibles:`);
    console.log(`  npm run dev      → servidor con auto-reload`);
    console.log(`  npm run migrate  → crear tablas en la BD`);
    console.log(`  npm run seed     → insertar datos de prueba`);
  });
}

main();