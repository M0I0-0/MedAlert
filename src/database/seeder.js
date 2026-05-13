// src/database/seeder.js
const { pool, testConnection } = require("./connection");

async function seed() {
  await testConnection();
  const conn = await pool.getConnection();

  try {
    console.log("🌱 Iniciando seeder...\n");

    await conn.query("SET FOREIGN_KEY_CHECKS = 0");

    const tablas = [
      "password_resets",
      "token_sesion",
      "nota_medica",
      "toma_recordatorio", // Nueva tabla
      "historial_prescripcion", // Nueva tabla
      "prescripcion", // Nueva tabla
      "interacciones_medicas",
      "medicamento_catalogo", // Nueva tabla
      "familiar_paciente",
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
    // NOTA: Ya no incluimos historial_clinico porque no está en el esquema
    await conn.query(`
      INSERT INTO paciente (id_medico, id_administrador, nombre_completo, edad, estatura_cm, peso_kg, telefono, correo, historial_clinico, alergias, contrasena) VALUES
        (1, 1, 'Juan Pérez Hernández', 65, 168.00, 72.50, '5512345678', 'juan.perez@gmail.com', 'Diabetes mellitus tipo 2 e hipertensión.', 'Penicilina', 'Paciente@123'),
        (2, 1, 'Gustavo Ruiz', 24, 175.00, 70.00, '5523456789', 'gustavo.ruiz@gmail.com', 'Tratamiento ambulatorio por migraña.', 'Ninguna', 'Paciente@123'),
        (3, 1, 'Margarita Pech', 55, 160.00, 65.00, '5534567891', 'margarita.pech@gmail.com', 'Control lipídico y seguimiento cardiometabólico.', 'Sulfonamidas', 'Paciente@123')
    `);

    // ─── 5. FAMILIARES / CUIDADORES ──────────────────────────────
    await conn.query(`
      INSERT INTO familiar_cuidador (id_administrador, nombre_completo, telefono, correo, relacion_principal, contrasena) VALUES
        (1, 'Cristian Medina', '5511112222', 'cristian.medina@gmail.com', 'Cuidador profesional', 'Familiar@123')
    `);

    await conn.query(
      `INSERT INTO familiar_paciente (id_familiar, id_paciente) VALUES (1, 3)`,
    );

    // ─── 6. INTERACCIONES MÉDICAS (Las 20 Críticas) ──────────────
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

    // ─── 7. CATÁLOGO DE MEDICAMENTOS (Inventario) ────────────
    await conn.query(`
      INSERT INTO medicamento_catalogo (id_farmaceutico, nombre_comercial, principio_activo, presentacion) VALUES
        (1, 'Aspirina Protect', 'Aspirina', 'Tableta 100mg'),
        (1, 'Coumadin', 'Warfarina', 'Tableta 5mg'),
        (1, 'Glafornil', 'Metformina', 'Tableta 850mg'),
        (2, 'Lanoxin', 'Digoxina', 'Tableta 0.25mg'),
        (2, 'Viagra', 'Sildenafil', 'Tableta 50mg'),
        (1, 'Lipitor', 'Atorvastatina', 'Tableta 20mg')
    `);

    // ─── 8. PRESCRIPCIONES (La Receta del Médico) ────────────
    await conn.query(`
      INSERT INTO prescripcion (id_paciente, id_medico, id_medicamento, dosis_instruccion, patron_horario, duracion_dias, indicaciones, stock_estimado, activa, ultima_dispensacion) VALUES
        (1, 1, 3, '1 tableta de 850mg', 'diario_con_alimentos', 30, 'Tomar con alimentos y evitar omitir la toma nocturna.', 60, 1, NOW()),
        (2, 2, 5, '1 tableta', 'solo_fines_de_semana', 14, 'Usar solo si aparece el cuadro indicado por su médico.', 10, 1, NOW()),
        (3, 3, 6, '1 tableta 20mg', 'diario_noche', 30, 'Tomar antes de dormir con seguimiento semanal.', 30, 1, NOW())
    `);

    // ─── 9. TOMAS / RECORDATORIOS (Simulando métricas de adherencia) ──────────
    // Simulamos que Gustavo olvidó una toma y Margarita la reportó con efecto adverso
    await conn.query(`
      INSERT INTO toma_recordatorio (id_prescripcion, fecha_hora_programada, fecha_hora_real, estatus, motivo_omision, omision_justificada) VALUES
        (1, '2026-05-13 08:00:00', '2026-05-13 08:05:00', 'cumplido', NULL, 0),
        (1, '2026-05-13 20:00:00', NULL, 'pendiente', NULL, 0),
        (2, '2026-05-09 20:00:00', NULL, 'no_cumplido', 'olvido', 0),
        (3, '2026-05-12 21:00:00', NULL, 'no_cumplido', 'efecto_adverso', 1)
    `);

    await conn.query(`
      INSERT INTO nota_medica (id_paciente, id_medico, contenido) VALUES
        (1, 1, 'Reforzar adherencia nocturna y vigilar glucosa capilar.'),
        (3, 3, 'Si presenta mareo persistente, programar revisión remota de dosis.')
    `);

    console.log("  ✅ Datos de prueba insertados con la nueva arquitectura");
    console.log(
      "\n🎉 Seeder completado. Todo listo para trabajar en el Backend.",
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
