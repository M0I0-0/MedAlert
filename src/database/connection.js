// src/database/connection.js
// Conexión a MySQL usando un pool de conexiones con mysql2
// Un pool reutiliza conexiones en lugar de abrir una nueva cada vez,
// lo que es más eficiente para múltiples peticiones.

const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "recordatorios_db",
  waitForConnections: true, // espera si todas las conexiones están ocupadas
  connectionLimit: 10,      // máximo de conexiones simultáneas
  queueLimit: 0,            // sin límite en la cola de espera
});

// Función para verificar que la conexión funciona al iniciar
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Conexión a MySQL establecida correctamente");
    connection.release(); // siempre liberar la conexión al pool
  } catch (error) {
    console.error("❌ Error al conectar con MySQL:", error.message);
    process.exit(1); // detiene la app si no hay conexión
  }
}

module.exports = { pool, testConnection };