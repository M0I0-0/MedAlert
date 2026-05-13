// src/database/seeder.js
const { pool, testConnection } = require("./connection");

async function seed() {
  await testConnection();
  const conn = await pool.getConnection();

  try {
    console.log("🌱 Iniciando seeder...\n");

    await conn.query("SET FOREIGN_KEY_CHECKS = 0");

    const tablas = [
      "token_sesion",
      "recordatorio",
      "interacciones_medicas",
      "familiar_paciente",
      "medicamento",
      "familiar_cuidador",
      "paciente",
      "farmaceutico",
      "medico",
      "administrador",
    ];

    for (const tabla of tablas) {
      await conn.query(`TRUNCATE TABLE ${tabla}`);
    }

    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("  🗑️  Tablas limpiadas\n");

    // ─── 1. ADMINISTRADOR ────────────────────────────────────────
    await conn.query(`
      INSERT INTO administrador (nombre, correo, telefono, contrasena) VALUES
        ('Admin Principal', 'admin@recordatorios.com', '5511223344', 'Admin@12345')
    `);

    // ─── 2. MÉDICOS ──────────────────────────────────────────────
    await conn.query(`
      INSERT INTO medico (id_administrador, nombre_completo, cedula_profesional, especialidad, telefono, correo, contrasena) VALUES
        (1, 'Dr. Carlos Ramírez López',  '1234567', 'Medicina General', '5521345678', 'carlos.ramirez@hospital.com', 'Medico@123'),
        (1, 'Dra. Jayanti Saraí Mendoza Aké', '7654321', 'Cardiología', '5598765432', 'jayanti.mendoza@hospital.com', 'Medico@123'),
        (1, 'Dr. Ernesto Vega Salinas',  '9876543', 'Geriatría', '5534567890', 'ernesto.vega@hospital.com', 'Medico@123')
    `);

    // ─── 3. FARMACÉUTICOS ────────────────────────────────────────
    await conn.query(`
      INSERT INTO farmaceutico (id_administrador, nombre_completo, cedula_profesional, telefono, correo, permiso_dispensar, contrasena) VALUES
        (1, 'Lic. Lucio Alejandro Osalde Ballina', 'F-001234', '5544332211', 'lucio.osalde@farmacia.com', 1, 'Farmacia@123'),
        (1, 'Lic. Ana Flores Ramos', 'F-009012', '5577889900', 'ana.flores@farmacia.com', 0, 'Farmacia@123')
    `);

    // ─── 4. PACIENTES ────────────────────────────────────────────
    await conn.query(`
      INSERT INTO paciente (id_medico, id_administrador, nombre_completo, edad, estatura_cm, peso_kg, telefono, correo, alergias, contrasena) VALUES
        (1, 1, 'Juan Pérez Hernández', 65, 168.00, 72.50, '5512345678', 'juan.perez@gmail.com', 'Penicilina', 'Paciente@123'),
        (2, 1, 'Gustavo Ruiz', 24, 175.00, 70.00, '5523456789', 'gustavo.ruiz@gmail.com', 'Ninguna', 'Paciente@123'),
        (3, 1, 'Margarita Pech', 55, 160.00, 65.00, '5534567891', 'margarita.pech@gmail.com', 'Sulfonamidas', 'Paciente@123')
    `);

    // ─── 5. FAMILIARES / CUIDADORES ──────────────────────────────
    await conn.query(`
      INSERT INTO familiar_cuidador (id_administrador, nombre_completo, telefono, correo, contrasena) VALUES
        (1, 'Cristian Medina', '5511112222', 'cristian.medina@gmail.com', 'Familiar@123')
    `);

    // ─── 6. RELACIONES FAMILIAR ↔ PACIENTE ───────────────────────
    await conn.query(`
      INSERT INTO familiar_paciente (id_familiar, id_paciente) VALUES (1, 3)
    `);

    // ─── 7. INTERACCIONES MÉDICAS (Las 20 Críticas) ──────────────
    await conn.query(`
      INSERT INTO interacciones_medicas (principio_a, principio_b, nivel_riesgo, descripcion) VALUES
        ('Warfarina', 'Aspirina', 'alto', 'Aumento significativo del riesgo de hemorragia gastrointestinal.'),
        ('Sildenafil', 'Nitroglicerina', 'critico', 'Riesgo de hipotensión severa y potencialmente fatal.'),
        ('Metformina', 'Medio de contraste yodado', 'alto', 'Riesgo de acidosis láctica e insuficiencia renal.'),
        ('Omeprazol', 'Clopidogrel', 'medio', 'Omeprazol reduce la eficacia antiplaquetaria del clopidogrel.'),
        ('Amiodarona', 'Digoxina', 'alto', 'Aumento de los niveles de digoxina, riesgo de toxicidad cardíaca.'),
        ('Simvastatina', 'Claritromicina', 'alto', 'Riesgo elevado de miopatía y rabdomiólisis.'),
        ('Litio', 'Ibuprofeno', 'alto', 'Aumento de los niveles séricos de litio, riesgo de neurotoxicidad.'),
        ('Espironolactona', 'Enalapril', 'alto', 'Riesgo de hiperpotasemia severa.'),
        ('Warfarina', 'Ibuprofeno', 'alto', 'Aumento del INR y riesgo de sangrado gastrointestinal.'),
        ('Tramadol', 'Fluoxetina', 'critico', 'Riesgo de síndrome serotoninérgico severo.'),
        ('Ciprofloxacino', 'Teofilina', 'medio', 'Aumento de la concentración y toxicidad de la teofilina.'),
        ('Atorvastatina', 'Jugo de Toronja', 'medio', 'Aumento de los niveles de estatina en sangre.'),
        ('Alopurinol', 'Azatioprina', 'critico', 'Supresión de médula ósea severa.'),
        ('Metotrexato', 'Trimetoprima', 'critico', 'Toxicidad hematológica por antagonismo de folato.'),
        ('Digoxina', 'Furosemida', 'alto', 'Toxicidad por digoxina inducida por hipopotasemia.'),
        ('Levotiroxina', 'Calcio', 'bajo', 'El calcio disminuye la absorción de levotiroxina en el intestino.'),
        ('Hierro', 'Omeprazol', 'bajo', 'El ambiente gástrico menos ácido reduce la absorción de hierro.'),
        ('Ibuprofeno', 'Aspirina', 'medio', 'Antagonismo del efecto cardioprotector de la aspirina.'),
        ('Fluconazol', 'Warfarina', 'alto', 'Inhibición del metabolismo de warfarina, riesgo de sangrado.'),
        ('Fenitoína', 'Anticonceptivos orales', 'medio', 'Reducción de la eficacia anticonceptiva, riesgo de embarazo.')
    `);
    console.log(
      "  ✅ Catálogo de Interacciones Médicas cargado (20 registros)",
    );

    // ─── 8. MEDICAMENTOS (Adaptados al nuevo esquema) ────────────
    await conn.query(`
      INSERT INTO medicamento (id_farmaceutico, nombre, principio_activo, presentacion, stock_estimado) VALUES
        (1, 'Aspirina Protect', 'Aspirina', 'Tableta 100mg', 30),
        (1, 'Coumadin', 'Warfarina', 'Tableta 5mg', 20),
        (1, 'Glafornil', 'Metformina', 'Tableta 850mg', 60),
        (2, 'Lanoxin', 'Digoxina', 'Tableta 0.25mg', 15),
        (2, 'Viagra', 'Sildenafil', 'Tableta 50mg', 10),
        (1, 'Lipitor', 'Atorvastatina', 'Tableta 20mg', 30)
    `);

    // ─── 9. RECORDATORIOS (Con simulador de adherencia) ──────────
    // Simulamos que Gustavo tiene problemas de adherencia ("olvido")
    await conn.query(`
      INSERT INTO recordatorio (id_paciente, id_medicamento, dosis, fecha_hora_programada, fecha_hora_real, estatus, motivo_omision) VALUES
        (1, 3, '1 tableta', '2026-05-13 08:00:00', '2026-05-13 08:05:00', 'tomado', NULL),
        (1, 3, '1 tableta', '2026-05-13 20:00:00', NULL, 'pendiente', NULL),
        (2, 5, '1 tableta', '2026-05-12 09:00:00', NULL, 'omitido', 'olvido'),
        (2, 5, '1 tableta', '2026-05-13 09:00:00', NULL, 'omitido', 'olvido'),
        (3, 6, '1 tableta', '2026-05-13 07:00:00', '2026-05-13 07:45:00', 'tomado', NULL)
    `);
    console.log("  ✅ Recordatorios y métricas de prueba insertados");

    console.log(
      "\n🎉 Seeder completado. El motor de interacciones está listo para probarse.",
    );
  } catch (error) {
    console.error("\n❌ Error en el seeder:", error.message);
    throw error;
  } finally {
    conn.release();
    pool.end();
  }
}

seed();
