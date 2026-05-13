// src/database/migrate.js
// Ejecuta: npm run migrate
// Crea todas las tablas en orden respetando las llaves foráneas e integrando la lógica de MedAlert.

const mysql = require("mysql2/promise");
require("dotenv").config();

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });
}

const migrations = [
  {
    name: "Crear base de datos",
    sql: `
      CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "recordatorios_db"}\`
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci;
      USE \`${process.env.DB_NAME || "recordatorios_db"}\`;
    `,
  },
  {
    name: "Tabla: administrador",
    sql: `
      CREATE TABLE IF NOT EXISTS administrador (
        id_administrador  INT            NOT NULL AUTO_INCREMENT,
        nombre            VARCHAR(100)   NOT NULL,
        correo            VARCHAR(150)   NOT NULL,
        telefono          VARCHAR(20)    NULL,
        contrasena        VARCHAR(255)   NOT NULL,
        created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_administrador),
        UNIQUE KEY uq_admin_correo (correo)
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: medico",
    sql: `
      CREATE TABLE IF NOT EXISTS medico (
        id_medico           INT           NOT NULL AUTO_INCREMENT,
        id_administrador    INT           NOT NULL,
        nombre_completo     VARCHAR(150)  NOT NULL,
        cedula_profesional  VARCHAR(50)   NOT NULL,
        especialidad        VARCHAR(100)  NOT NULL,
        telefono            VARCHAR(20)   NULL,
        correo              VARCHAR(150)  NOT NULL,
        contrasena          VARCHAR(255)  NOT NULL,
        created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_medico),
        UNIQUE KEY uq_medico_cedula (cedula_profesional),
        UNIQUE KEY uq_medico_correo (correo),
        CONSTRAINT fk_medico_admin FOREIGN KEY (id_administrador) 
          REFERENCES administrador (id_administrador) ON UPDATE CASCADE ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: farmaceutico",
    sql: `
      CREATE TABLE IF NOT EXISTS farmaceutico (
        id_farmaceutico     INT           NOT NULL AUTO_INCREMENT,
        id_administrador    INT           NOT NULL,
        nombre_completo     VARCHAR(150)  NOT NULL,
        cedula_profesional  VARCHAR(50)   NOT NULL,
        correo              VARCHAR(150)  NOT NULL,
        permiso_dispensar   TINYINT(1)    NOT NULL DEFAULT 0,
        contrasena          VARCHAR(255)  NOT NULL,
        created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_farmaceutico),
        UNIQUE KEY uq_farm_cedula (cedula_profesional),
        UNIQUE KEY uq_farm_correo (correo),
        CONSTRAINT fk_farmaceutico_admin FOREIGN KEY (id_administrador) 
          REFERENCES administrador (id_administrador) ON UPDATE CASCADE ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: paciente",
    sql: `
      CREATE TABLE IF NOT EXISTS paciente (
        id_paciente       INT              NOT NULL AUTO_INCREMENT,
        id_medico         INT              NOT NULL,
        id_administrador  INT              NOT NULL,
        nombre_completo   VARCHAR(150)     NOT NULL,
        edad              TINYINT UNSIGNED NOT NULL,
        peso_kg           DECIMAL(5,2)     NULL,
        telefono          VARCHAR(20)      NULL,
        correo            VARCHAR(150)     NOT NULL,
        alergias          TEXT             NULL,
        contrasena        VARCHAR(255)     NOT NULL,
        created_at        TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_paciente),
        UNIQUE KEY uq_paciente_correo (correo),
        CONSTRAINT fk_paciente_medico FOREIGN KEY (id_medico) 
          REFERENCES medico (id_medico) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_paciente_admin FOREIGN KEY (id_administrador) 
          REFERENCES administrador (id_administrador) ON UPDATE CASCADE ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: familiar_cuidador",
    sql: `
      CREATE TABLE IF NOT EXISTS familiar_cuidador (
        id_familiar       INT           NOT NULL AUTO_INCREMENT,
        id_administrador  INT           NOT NULL,
        nombre_completo   VARCHAR(150)  NOT NULL,
        telefono          VARCHAR(20)   NULL,
        correo            VARCHAR(150)  NOT NULL,
        contrasena        VARCHAR(255)  NOT NULL,
        created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_familiar),
        UNIQUE KEY uq_familiar_correo (correo),
        CONSTRAINT fk_familiar_admin FOREIGN KEY (id_administrador) 
          REFERENCES administrador (id_administrador) ON UPDATE CASCADE ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: familiar_paciente (Relación)",
    sql: `
      CREATE TABLE IF NOT EXISTS familiar_paciente (
        id_familiar INT NOT NULL,
        id_paciente INT NOT NULL,
        PRIMARY KEY (id_familiar, id_paciente),
        CONSTRAINT fk_fp_familiar FOREIGN KEY (id_familiar) REFERENCES familiar_cuidador (id_familiar) ON DELETE CASCADE,
        CONSTRAINT fk_fp_paciente FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: medicamento (Módulo Interacciones)",
    sql: `
      CREATE TABLE IF NOT EXISTS medicamento (
        id_medicamento   INT           NOT NULL AUTO_INCREMENT,
        id_farmaceutico  INT           NOT NULL,
        nombre           VARCHAR(150)  NOT NULL,
        principio_activo VARCHAR(150)  NOT NULL,
        presentacion     VARCHAR(100)  NULL,
        stock_estimado   INT           DEFAULT 0,
        PRIMARY KEY (id_medicamento),
        CONSTRAINT fk_med_farm FOREIGN KEY (id_farmaceutico) REFERENCES farmaceutico (id_farmaceutico)
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: interacciones_medicas (Catálogo)",
    sql: `
      CREATE TABLE IF NOT EXISTS interacciones_medicas (
        id_interaccion INT NOT NULL AUTO_INCREMENT,
        principio_a    VARCHAR(150) NOT NULL,
        principio_b    VARCHAR(150) NOT NULL,
        nivel_riesgo   ENUM('bajo', 'medio', 'alto', 'critico') NOT NULL,
        descripcion    TEXT,
        PRIMARY KEY (id_interaccion)
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: recordatorio (Módulo Adherencia)",
    sql: `
      CREATE TABLE IF NOT EXISTS recordatorio (
        id_recordatorio       INT       NOT NULL AUTO_INCREMENT,
        id_paciente           INT       NOT NULL,
        id_medicamento        INT       NOT NULL,
        dosis                 VARCHAR(80) NOT NULL,
        fecha_hora_programada DATETIME  NOT NULL,
        fecha_hora_real       DATETIME  NULL,
        estatus               ENUM('pendiente','tomado','omitido') NOT NULL DEFAULT 'pendiente',
        motivo_omision        ENUM('olvido','efecto_adverso','otro') NULL,
        observaciones         TEXT      NULL,
        PRIMARY KEY (id_recordatorio),
        CONSTRAINT fk_rec_paciente FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente) ON DELETE CASCADE,
        CONSTRAINT fk_rec_medicamento FOREIGN KEY (id_medicamento) REFERENCES medicamento (id_medicamento)
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: token_sesion (Seguridad Única)",
    sql: `
      CREATE TABLE IF NOT EXISTS token_sesion (
        id_token    INT           NOT NULL AUTO_INCREMENT,
        token       VARCHAR(255)  NOT NULL,
        id_usuario  INT           NOT NULL,
        rol         ENUM('administrador','medico','farmaceutico','paciente','familiar') NOT NULL,
        expira_en   DATETIME      NOT NULL,
        PRIMARY KEY (id_token),
        UNIQUE KEY uq_token (token)
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Vista: métricas de adherencia",
    sql: `
      CREATE OR REPLACE VIEW vista_metricas_paciente AS
      SELECT 
        p.id_paciente, 
        p.nombre_completo AS paciente,
        COUNT(r.id_recordatorio) AS total,
        SUM(r.estatus = 'tomado') AS cumplidos,
        ROUND(SUM(r.estatus = 'tomado') / COUNT(r.id_recordatorio) * 100, 1) AS porcentaje_adherencia
      FROM paciente p
      LEFT JOIN recordatorio r ON p.id_paciente = r.id_paciente
      GROUP BY p.id_paciente;
    `,
  },
];

async function runMigrations() {
  const conn = await getConnection();
  const dbName = process.env.DB_NAME || "recordatorios_db";
  console.log("🚀 Iniciando migración MedAlert...");

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await conn.query(`USE \`${dbName}\`;`);

    for (const m of migrations) {
      await conn.query(m.sql);
      console.log(` ✅ ${m.name}`);
    }

    console.log("\n🎉 Estructura de MedAlert lista.");
  } catch (error) {
    console.error(" ❌ Error:", error.message);
  } finally {
    await conn.end();
  }
}

runMigrations();
