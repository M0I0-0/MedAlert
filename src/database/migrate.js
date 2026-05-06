// src/database/migrate.js
// Ejecuta: npm run migrate
// Crea todas las tablas en orden respetando las llaves foráneas.

const mysql = require("mysql2/promise");
require("dotenv").config();

// Conexión temporal sin especificar la base de datos,
// por si todavía no existe (la creamos aquí mismo).
async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });
}

// Cada elemento del array es una migración independiente
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
        correo            VARCHAR(150)   NULL,
        telefono          VARCHAR(20)    NULL,
        contrasena        VARCHAR(255)   NOT NULL
          COMMENT 'Guardar siempre con hash. Regla: 10-15 chars, May+min+num+símbolo.',
        created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (id_administrador),
        UNIQUE KEY uq_admin_correo (correo),
        CONSTRAINT chk_admin_contacto CHECK (correo IS NOT NULL OR telefono IS NOT NULL)
      ) ENGINE=InnoDB COMMENT='Único rol que da de alta usuarios';
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
        correo              VARCHAR(150)  NULL,
        contrasena          VARCHAR(255)  NOT NULL,
        created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (id_medico),
        UNIQUE KEY uq_medico_cedula (cedula_profesional),
        CONSTRAINT fk_medico_admin
          FOREIGN KEY (id_administrador) REFERENCES administrador (id_administrador)
          ON UPDATE CASCADE ON DELETE RESTRICT
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
        telefono            VARCHAR(20)   NULL,
        correo              VARCHAR(150)  NULL,
        permiso_dispensar   TINYINT(1)    NOT NULL DEFAULT 0,
        contrasena          VARCHAR(255)  NOT NULL,
        created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (id_farmaceutico),
        UNIQUE KEY uq_farm_cedula (cedula_profesional),
        CONSTRAINT fk_farmaceutico_admin
          FOREIGN KEY (id_administrador) REFERENCES administrador (id_administrador)
          ON UPDATE CASCADE ON DELETE RESTRICT
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
        estatura_cm       DECIMAL(5,2)     NULL,
        peso_kg           DECIMAL(5,2)     NULL,
        telefono          VARCHAR(20)      NULL,
        correo            VARCHAR(150)     NULL,
        historial_clinico TEXT             NULL,
        alergias          TEXT             NULL,
        contrasena        VARCHAR(255)     NOT NULL,
        created_at        TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (id_paciente),
        CONSTRAINT fk_paciente_medico
          FOREIGN KEY (id_medico) REFERENCES medico (id_medico)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_paciente_admin
          FOREIGN KEY (id_administrador) REFERENCES administrador (id_administrador)
          ON UPDATE CASCADE ON DELETE RESTRICT
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
        edad              TINYINT UNSIGNED NULL,
        telefono          VARCHAR(20)   NULL,
        correo            VARCHAR(150)  NULL,
        relacion_paciente VARCHAR(80)   NOT NULL,
        contrasena        VARCHAR(255)  NOT NULL,
        created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (id_familiar),
        CONSTRAINT fk_familiar_admin
          FOREIGN KEY (id_administrador) REFERENCES administrador (id_administrador)
          ON UPDATE CASCADE ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: familiar_paciente (N:M)",
    sql: `
      CREATE TABLE IF NOT EXISTS familiar_paciente (
        id_familiar       INT  NOT NULL,
        id_paciente       INT  NOT NULL,
        fecha_asignacion  DATE NOT NULL DEFAULT (CURRENT_DATE),

        PRIMARY KEY (id_familiar, id_paciente),
        CONSTRAINT fk_fp_familiar
          FOREIGN KEY (id_familiar) REFERENCES familiar_cuidador (id_familiar)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_fp_paciente
          FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: medicamento",
    sql: `
      CREATE TABLE IF NOT EXISTS medicamento (
        id_medicamento  INT           NOT NULL AUTO_INCREMENT,
        id_farmaceutico INT           NOT NULL,
        nombre          VARCHAR(150)  NOT NULL,
        descripcion     TEXT          NULL,
        presentacion    VARCHAR(100)  NULL,
        created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (id_medicamento),
        CONSTRAINT fk_medicamento_farm
          FOREIGN KEY (id_farmaceutico) REFERENCES farmaceutico (id_farmaceutico)
          ON UPDATE CASCADE ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: recordatorio",
    sql: `
      CREATE TABLE IF NOT EXISTS recordatorio (
        id_recordatorio       INT       NOT NULL AUTO_INCREMENT,
        id_paciente           INT       NOT NULL,
        id_medicamento        INT       NOT NULL,
        dosis                 VARCHAR(80) NOT NULL,
        fecha_hora_toma       DATETIME  NOT NULL,
        recordatorio_2h_antes DATETIME  NOT NULL,
        estatus               ENUM('pendiente','tomado','omitido') NOT NULL DEFAULT 'pendiente',
        observaciones         TEXT      NULL,
        created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (id_recordatorio),
        CONSTRAINT fk_rec_paciente
          FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_rec_medicamento
          FOREIGN KEY (id_medicamento) REFERENCES medicamento (id_medicamento)
          ON UPDATE CASCADE ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: token_sesion",
    sql: `
      CREATE TABLE IF NOT EXISTS token_sesion (
        id_token    INT           NOT NULL AUTO_INCREMENT,
        token       VARCHAR(255)  NOT NULL,
        rol         ENUM('administrador','medico','farmaceutico','paciente','familiar') NOT NULL,
        id_usuario  INT           NOT NULL,
        expira_en   DATETIME      NOT NULL,
        usado       TINYINT(1)    NOT NULL DEFAULT 0,
        created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (id_token),
        UNIQUE KEY uq_token (token),
        INDEX idx_token_expira (expira_en)
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: password_resets",
    sql: `
      CREATE TABLE IF NOT EXISTS password_resets (
        id          INT           NOT NULL AUTO_INCREMENT,
        correo      VARCHAR(150)  NOT NULL,
        token       VARCHAR(255)  NOT NULL,
        expiracion  DATETIME      NOT NULL,
        usado       TINYINT(1)    NOT NULL DEFAULT 0,
        created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (id),
        UNIQUE KEY uq_password_reset_token (token),
        INDEX idx_password_reset_correo (correo)
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Trigger: calcular recordatorio_2h_antes",
    sql: `
      DROP TRIGGER IF EXISTS trg_recordatorio_before_insert;
      CREATE TRIGGER trg_recordatorio_before_insert
      BEFORE INSERT ON recordatorio
      FOR EACH ROW
      BEGIN
        SET NEW.recordatorio_2h_antes = DATE_SUB(NEW.fecha_hora_toma, INTERVAL 2 HOUR);
      END;
    `,
  },
  {
    name: "Vista: métricas por paciente",
    sql: `
      CREATE OR REPLACE VIEW vista_metricas_paciente AS
      SELECT
        p.id_paciente,
        p.nombre_completo AS paciente,
        COUNT(r.id_recordatorio) AS total_recordatorios,
        SUM(r.estatus = 'tomado')   AS tomados,
        SUM(r.estatus = 'omitido')  AS omitidos,
        SUM(r.estatus = 'pendiente') AS pendientes,
        ROUND(SUM(r.estatus = 'tomado') / NULLIF(COUNT(r.id_recordatorio),0) * 100, 1)
          AS porcentaje_adherencia
      FROM paciente p
      LEFT JOIN recordatorio r ON r.id_paciente = p.id_paciente
      GROUP BY p.id_paciente, p.nombre_completo;
    `,
  },
];

async function runMigrations() {
  const conn = await getConnection();
  const dbName = process.env.DB_NAME || "recordatorios_db";
  console.log("🚀 Iniciando migraciones...\n");

  // Usar la base de datos correcta desde la segunda migración en adelante
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await conn.query(`USE \`${dbName}\`;`);

  for (const migration of migrations) {
    try {
      await conn.query(migration.sql);
      console.log(`  ✅ ${migration.name}`);
    } catch (error) {
      console.error(`  ❌ ${migration.name}:`, error.message);
      await conn.end();
      process.exit(1);
    }
  }

  async function ensureColumn(tableName, columnName, definition) {
    const [rows] = await conn.query(
      `SELECT 1
         FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
        LIMIT 1`,
      [dbName, tableName, columnName]
    );

    if (rows.length === 0) {
      await conn.query(
        `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`
      );
      console.log(`  ✅ Columna agregada: ${tableName}.${columnName}`);
    }
  }

  await ensureColumn("medico", "contrasena", "VARCHAR(255) NOT NULL DEFAULT 'TempPass@123'");
  await ensureColumn("farmaceutico", "contrasena", "VARCHAR(255) NOT NULL DEFAULT 'TempPass@123'");
  await ensureColumn("paciente", "contrasena", "VARCHAR(255) NOT NULL DEFAULT 'TempPass@123'");
  await ensureColumn("familiar_cuidador", "contrasena", "VARCHAR(255) NOT NULL DEFAULT 'TempPass@123'");

  console.log("\n🎉 Todas las migraciones completadas correctamente");
  await conn.end();
}

runMigrations();
