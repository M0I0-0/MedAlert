// src/database/seeder.js
// Ejecuta: npm run seed
// Inserta datos de prueba para los 5 roles y tablas relacionadas.
// Si ya existen datos, los elimina y los vuelve a insertar (TRUNCATE).

const { pool, testConnection } = require("./connection");

async function seed() {
  await testConnection();
  const conn = await pool.getConnection();

  try {
    console.log("🌱 Iniciando seeder...\n");

    // Desactivar temporalmente las FK para poder hacer TRUNCATE
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");

    const tablas = [
      "password_resets",
      "token_sesion",
      "recordatorio",
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
    // Nota: en producción la contraseña debe guardarse con bcrypt.
    // Aquí usamos texto plano solo para propósitos de prueba.
    await conn.query(`
      INSERT INTO administrador (nombre, correo, telefono, contrasena) VALUES
        ('Admin Principal', 'admin@recordatorios.com', '5511223344', 'Admin@12345'),
        ('Admin Secundario', 'admin2@recordatorios.com', '5599887766', 'Segur0#Admin')
    `);
    console.log("  ✅ Administradores insertados");

    // ─── 2. MÉDICOS ──────────────────────────────────────────────
    await conn.query(`
      INSERT INTO medico (id_administrador, nombre_completo, cedula_profesional, especialidad, telefono, correo, contrasena) VALUES
        (1, 'Dr. Carlos Ramírez López',  '1234567', 'Medicina General',    '5521345678', 'carlos.ramirez@hospital.com', 'Medico@123'),
        (1, 'Dra. Sofía Mendoza Torres', '7654321', 'Cardiología',         '5598765432', 'sofia.mendoza@hospital.com', 'Medico@123'),
        (1, 'Dr. Ernesto Vega Salinas',  '9876543', 'Geriatría',           '5534567890', 'ernesto.vega@hospital.com', 'Medico@123')
    `);
    console.log("  ✅ Médicos insertados");

    // ─── 3. FARMACÉUTICOS ────────────────────────────────────────
    await conn.query(`
      INSERT INTO farmaceutico (id_administrador, nombre_completo, cedula_profesional, telefono, correo, permiso_dispensar, contrasena) VALUES
        (1, 'Lic. María Gutiérrez Cruz',   'F-001234', '5544332211', 'maria.gutierrez@farmacia.com',  1, 'Farmacia@123'),
        (1, 'Lic. Jorge Sánchez Pérez',    'F-005678', '5566778899', 'jorge.sanchez@farmacia.com',    1, 'Farmacia@123'),
        (1, 'Lic. Ana Flores Ramos',       'F-009012', '5577889900', 'ana.flores@farmacia.com',       0, 'Farmacia@123')
    `);
    console.log("  ✅ Farmacéuticos insertados");

    // ─── 4. PACIENTES ────────────────────────────────────────────
    await conn.query(`
      INSERT INTO paciente
        (id_medico, id_administrador, nombre_completo, edad, estatura_cm, peso_kg, telefono, correo, historial_clinico, alergias, contrasena)
      VALUES
        (1, 1, 'Juan Pérez Hernández',    65, 168.00, 72.50, '5512345678', 'juan.perez@gmail.com',
         'Hipertensión arterial diagnosticada en 2018. Control mensual.',
         'Penicilina', 'Paciente@123'),

        (2, 1, 'Rosa Martínez García',    72, 155.00, 61.00, '5523456789', 'rosa.martinez@gmail.com',
         'Diabetes tipo 2. Tratamiento con metformina desde 2020.',
         'Sulfonamidas, ibuprofeno', 'Paciente@123'),

        (3, 1, 'Pedro Alvarado Ruiz',     80, 172.00, 68.00, '5534567891', 'pedro.alvarado@gmail.com',
         'Insuficiencia cardíaca leve. Control quincenal.',
         'Ninguna conocida', 'Paciente@123'),

        (1, 1, 'Lucía Torres Vázquez',    45, 162.00, 58.00, '5545678902', 'lucia.torres@gmail.com',
         'Hipotiroidismo. Tratamiento con levotiroxina.',
         'Látex', 'Paciente@123'),

        (2, 1, 'Miguel Ángel Soto Díaz',  58, 175.00, 85.00, '5556789013', 'miguel.soto@gmail.com',
         'Hipercolesterolemia. Dieta controlada y estatinas.',
         'Aspirina', 'Paciente@123')
    `);
    console.log("  ✅ Pacientes insertados");

    // ─── 5. FAMILIARES / CUIDADORES ──────────────────────────────
    await conn.query(`
      INSERT INTO familiar_cuidador
        (id_administrador, nombre_completo, edad, telefono, correo, relacion_paciente, contrasena)
      VALUES
        (1, 'Laura Pérez Hernández',   40, '5511112222', 'laura.perez@gmail.com',   'Hija', 'Familiar@123'),
        (1, 'Roberto Martínez Gil',    50, '5522223333', 'roberto.mtz@gmail.com',   'Hijo', 'Familiar@123'),
        (1, 'Carmen Ruiz Alvarado',    55, '5533334444', 'carmen.ruiz@gmail.com',   'Esposa', 'Familiar@123'),
        (1, 'Diana Torres Luna',       35, '5544445555', 'diana.torres@gmail.com',  'Hija', 'Familiar@123'),
        (1, 'Ernesto Soto Reyes',      62, '5555556666', 'ernesto.soto@gmail.com',  'Esposo', 'Familiar@123')
    `);
    console.log("  ✅ Familiares/cuidadores insertados");

    // ─── 6. RELACIONES FAMILIAR ↔ PACIENTE ───────────────────────
    // Un cuidador puede cuidar varios pacientes
    await conn.query(`
      INSERT INTO familiar_paciente (id_familiar, id_paciente) VALUES
        (1, 1),  -- Laura cuida a Juan
        (2, 2),  -- Roberto cuida a Rosa
        (3, 3),  -- Carmen cuida a Pedro
        (1, 4),  -- Laura también cuida a Lucía (un cuidador, dos pacientes)
        (4, 4),  -- Diana también cuida a Lucía
        (5, 5)   -- Ernesto cuida a Miguel
    `);
    console.log("  ✅ Relaciones familiar-paciente insertadas");

    // ─── 7. MEDICAMENTOS ─────────────────────────────────────────
    await conn.query(`
      INSERT INTO medicamento (id_farmaceutico, nombre, descripcion, presentacion) VALUES
        (1, 'Losartán',        'Antihipertensivo, bloqueador de angiotensina II',       'Tableta 50mg'),
        (1, 'Metformina',      'Antidiabético oral, reduce glucosa en sangre',           'Tableta 850mg'),
        (2, 'Digoxina',        'Glucósido cardíaco para insuficiencia cardíaca',         'Tableta 0.25mg'),
        (2, 'Levotiroxina',    'Hormona tiroidea sintética',                            'Tableta 50mcg'),
        (1, 'Atorvastatina',   'Estatina para reducir colesterol LDL',                  'Tableta 20mg'),
        (2, 'Enalapril',       'IECA para control de presión arterial',                 'Tableta 10mg'),
        (1, 'Omeprazol',       'Inhibidor de bomba de protones, protector gástrico',    'Cápsula 20mg')
    `);
    console.log("  ✅ Medicamentos insertados");

    // ─── 8. RECORDATORIOS ────────────────────────────────────────
    // recordatorio_2h_antes lo calcula automáticamente el trigger
    await conn.query(`
      INSERT INTO recordatorio
        (id_paciente, id_medicamento, dosis, fecha_hora_toma, recordatorio_2h_antes, estatus)
      VALUES
        (1, 1, '1 tableta',   '2026-05-06 08:00:00', '2026-05-06 06:00:00', 'pendiente'),
        (1, 1, '1 tableta',   '2026-05-06 20:00:00', '2026-05-06 18:00:00', 'pendiente'),
        (2, 2, '1 tableta',   '2026-05-06 07:00:00', '2026-05-06 05:00:00', 'tomado'),
        (2, 2, '1 tableta',   '2026-05-06 13:00:00', '2026-05-06 11:00:00', 'tomado'),
        (3, 3, '1/2 tableta', '2026-05-06 09:00:00', '2026-05-06 07:00:00', 'omitido'),
        (4, 4, '1 tableta',   '2026-05-06 07:30:00', '2026-05-06 05:30:00', 'tomado'),
        (5, 5, '1 tableta',   '2026-05-06 21:00:00', '2026-05-06 19:00:00', 'pendiente'),
        (1, 7, '1 cápsula',   '2026-05-06 08:00:00', '2026-05-06 06:00:00', 'pendiente'),
        (2, 6, '1 tableta',   '2026-05-06 12:00:00', '2026-05-06 10:00:00', 'tomado')
    `);
    console.log("  ✅ Recordatorios insertados");

    // ─── 9. TOKENS DE SESIÓN (ejemplo) ───────────────────────────
    await conn.query(`
      INSERT INTO token_sesion (token, rol, id_usuario, expira_en) VALUES
        ('tok_demo_admin_001', 'administrador', 1, DATE_ADD(NOW(), INTERVAL 5 MINUTE)),
        ('tok_demo_medico_001', 'medico',        1, DATE_ADD(NOW(), INTERVAL 5 MINUTE))
    `);
    console.log("  ✅ Tokens de sesión demo insertados");

    console.log("\n🎉 Seeder completado. Datos de prueba listos.");
  } catch (error) {
    console.error("\n❌ Error en el seeder:", error.message);
    throw error;
  } finally {
    conn.release();
    pool.end();
  }
}

seed();
