// src/database/migrate.js
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
    name: "Crear base de datos y limpiar esquema viejo",
    sql: `
      CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "recordatorios_db"}\`
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      USE \`${process.env.DB_NAME || "recordatorios_db"}\`;
      
      -- Limpiamos las tablas viejas para evitar conflictos con la nueva arquitectura
      SET FOREIGN_KEY_CHECKS = 0;
      DROP VIEW IF EXISTS vista_metricas_paciente;
      DROP TABLE IF EXISTS recordatorio;
      DROP TABLE IF EXISTS medicamento;
      SET FOREIGN_KEY_CHECKS = 1;
    `,
  },
  {
    name: "Tabla: administrador",
    sql: `
      CREATE TABLE IF NOT EXISTS administrador (
        id_administrador  INT           NOT NULL AUTO_INCREMENT,
        nombre            VARCHAR(100)  NOT NULL,
        correo            VARCHAR(150)  NOT NULL,
        telefono          VARCHAR(20)   NULL,
        contrasena        VARCHAR(255)  NOT NULL,
        created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
        telefono            VARCHAR(20)   NULL,
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
        estatura_cm       DECIMAL(5,2)     NULL,
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
    name: "Tabla: familiar_paciente",
    sql: `
      CREATE TABLE IF NOT EXISTS familiar_paciente (
        id_familiar INT NOT NULL,
        id_paciente INT NOT NULL,
        PRIMARY KEY (id_familiar, id_paciente),
        CONSTRAINT fk_fp_familiar FOREIGN KEY (id_familiar)
          REFERENCES familiar_cuidador (id_familiar) ON DELETE CASCADE,
        CONSTRAINT fk_fp_paciente FOREIGN KEY (id_paciente)
          REFERENCES paciente (id_paciente) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: medicamento_catalogo",
    sql: `
      CREATE TABLE IF NOT EXISTS medicamento_catalogo (
        id_medicamento   INT           NOT NULL AUTO_INCREMENT,
        id_farmaceutico  INT           NOT NULL,
        nombre_comercial VARCHAR(150)  NOT NULL,
        principio_activo VARCHAR(150)  NOT NULL,
        presentacion     VARCHAR(100)  NULL,
        PRIMARY KEY (id_medicamento),
        CONSTRAINT fk_med_farm FOREIGN KEY (id_farmaceutico)
          REFERENCES farmaceutico (id_farmaceutico) ON UPDATE CASCADE ON DELETE RESTRICT
      ) ENGINE=InnoDB COMMENT='Catálogo global de medicamentos (Inventario)';
    `,
  },
  {
    name: "Tabla: prescripcion",
    sql: `
      CREATE TABLE IF NOT EXISTS prescripcion (
        id_prescripcion   INT NOT NULL AUTO_INCREMENT,
        id_paciente       INT NOT NULL,
        id_medico         INT NOT NULL,
        id_medicamento    INT NOT NULL,
        dosis_instruccion VARCHAR(255) NOT NULL COMMENT 'Ej: 5mg/kg/dia',
        patron_horario    VARCHAR(100) NOT NULL COMMENT 'Ej: diario, fines_de_semana',
        stock_estimado    INT DEFAULT 0,
        activa            TINYINT(1) DEFAULT 1,
        version           INT DEFAULT 1,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        PRIMARY KEY (id_prescripcion),
        CONSTRAINT fk_presc_paciente FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente) ON DELETE CASCADE,
        CONSTRAINT fk_presc_medico FOREIGN KEY (id_medico) REFERENCES medico (id_medico) ON DELETE RESTRICT,
        CONSTRAINT fk_presc_med FOREIGN KEY (id_medicamento) REFERENCES medicamento_catalogo (id_medicamento) ON DELETE RESTRICT
      ) ENGINE=InnoDB COMMENT='Relación del tratamiento asignado a un paciente';
    `,
  },
  {
    name: "Tabla: historial_prescripcion",
    sql: `
      CREATE TABLE IF NOT EXISTS historial_prescripcion (
        id_historial       INT NOT NULL AUTO_INCREMENT,
        id_prescripcion    INT NOT NULL,
        id_medico_editor   INT NOT NULL,
        dosis_anterior     VARCHAR(255),
        patron_anterior    VARCHAR(100),
        fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        PRIMARY KEY (id_historial),
        CONSTRAINT fk_hist_presc FOREIGN KEY (id_prescripcion) REFERENCES prescripcion (id_prescripcion) ON DELETE CASCADE
      ) ENGINE=InnoDB COMMENT='Auditoría de cambios en las recetas';
    `,
  },
  {
    name: "Tabla: toma_recordatorio",
    sql: `
      CREATE TABLE IF NOT EXISTS toma_recordatorio (
        id_toma               INT NOT NULL AUTO_INCREMENT,
        id_prescripcion       INT NOT NULL,
        fecha_hora_programada DATETIME NOT NULL,
        fecha_hora_real       DATETIME NULL,
        estatus               ENUM('pendiente','cumplido','no_cumplido') NOT NULL DEFAULT 'pendiente',
        motivo_omision        ENUM('olvido','efecto_adverso','falta_stock','decision_medica','otro') NULL,
        omision_justificada   TINYINT(1) DEFAULT 0,
        observaciones         TEXT NULL,
        
        PRIMARY KEY (id_toma),
        CONSTRAINT fk_toma_presc FOREIGN KEY (id_prescripcion) REFERENCES prescripcion (id_prescripcion) ON DELETE CASCADE
      ) ENGINE=InnoDB COMMENT='Registro individual de cada toma programada';
    `,
  },
  {
    name: "Tabla: interacciones_medicas",
    sql: `
      CREATE TABLE IF NOT EXISTS interacciones_medicas (
        id_interaccion INT          NOT NULL AUTO_INCREMENT,
        principio_a    VARCHAR(150) NOT NULL,
        principio_b    VARCHAR(150) NOT NULL,
        nivel_riesgo   ENUM('bajo','medio','alto','critico') NOT NULL,
        descripcion    TEXT,
        PRIMARY KEY (id_interaccion)
      ) ENGINE=InnoDB;
    `,
  },
  {
    name: "Tabla: token_sesion",
    sql: `
      CREATE TABLE IF NOT EXISTS token_sesion (
        id_token    INT           NOT NULL AUTO_INCREMENT,
        token       VARCHAR(255)  NOT NULL,
        id_usuario  INT           NOT NULL,
        rol         ENUM('administrador','medico','farmaceutico','paciente','familiar') NOT NULL,
        expira_en   DATETIME      NOT NULL,
        usado       TINYINT(1)    NOT NULL DEFAULT 0,
        created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_token),
        UNIQUE KEY uq_token (token)
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
    name: "Vista: metricas de adherencia",
    sql: `
      CREATE OR REPLACE VIEW vista_metricas_paciente AS
      SELECT
        p.id_paciente,
        p.nombre_completo AS paciente,
        COUNT(t.id_toma) AS total,
        SUM(t.estatus = 'cumplido') AS cumplidos,
        SUM(t.estatus = 'no_cumplido') AS omitidos,
        SUM(t.estatus = 'pendiente') AS pendientes,
        ROUND(SUM(t.estatus = 'cumplido') / NULLIF(COUNT(t.id_toma), 0) * 100, 1) AS porcentaje_adherencia
      FROM paciente p
      LEFT JOIN prescripcion pr ON p.id_paciente = pr.id_paciente
      LEFT JOIN toma_recordatorio t ON pr.id_prescripcion = t.id_prescripcion
      GROUP BY p.id_paciente, p.nombre_completo;
    `,
  },
];

async function runMigrations() {
  const conn = await getConnection();
  const dbName = process.env.DB_NAME || "recordatorios_db";
  console.log("🚀 Iniciando migraciones MedAlert...\n");

  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    );
    await conn.query(`USE \`${dbName}\`;`);

    for (const m of migrations) {
      await conn.query(m.sql);
      console.log(`  ✅ ${m.name}`);
    }

    console.log("\n🎉 Todas las migraciones completadas correctamente.");
  } catch (error) {
    console.error("  ❌ Error:", error.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

runMigrations();
