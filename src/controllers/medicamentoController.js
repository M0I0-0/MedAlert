// src/controllers/medicamentoController.js
const { pool } = require("../database/connection");

// 1. Obtener el inventario (Para que el Médico o Farmacéutico busquen medicinas)
const obtenerCatalogo = async (req, res) => {
  try {
    const [medicamentos] = await pool.query(
      `SELECT * FROM medicamento_catalogo`,
    );
    return res.json({ ok: true, medicamentos });
  } catch (error) {
    console.error("Error al obtener catálogo:", error.message);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
};

// 2. Crear una Prescripción (Aquí ocurre la magia)
const prescribirMedicamento = async (req, res) => {
  const id_medico = req.usuario.id; // Lo sacamos del JWT, seguridad ante todo
  const {
    id_paciente,
    id_medicamento,
    dosis_instruccion,
    patron_horario,
    stock_estimado,
  } = req.body;

  if (
    !id_paciente ||
    !id_medicamento ||
    !dosis_instruccion ||
    !patron_horario
  ) {
    return res
      .status(400)
      .json({ ok: false, mensaje: "Faltan datos de la prescripción." });
  }

  // Usamos una transacción SQL para asegurar que todo se guarde perfecto
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // --- A) MOTOR DE INTERACCIONES MÉDICAS ---
    // 1. Saber qué le estamos intentando recetar
    const [nuevoMed] = await conn.query(
      `SELECT principio_activo FROM medicamento_catalogo WHERE id_medicamento = ?`,
      [id_medicamento],
    );
    if (nuevoMed.length === 0)
      throw new Error("Medicamento no existe en el catálogo.");
    const principioNuevo = nuevoMed[0].principio_activo;

    // 2. Saber qué está tomando el paciente actualmente
    const [activos] = await conn.query(
      `
      SELECT mc.principio_activo 
      FROM prescripcion p
      JOIN medicamento_catalogo mc ON p.id_medicamento = mc.id_medicamento
      WHERE p.id_paciente = ? AND p.activa = 1
    `,
      [id_paciente],
    );

    const principiosActuales = activos.map((a) => a.principio_activo);

    // 3. Buscar choques en la tabla de interacciones
    if (principiosActuales.length > 0) {
      const [interacciones] = await conn.query(
        `
        SELECT nivel_riesgo, descripcion, principio_a, principio_b
        FROM interacciones_medicas 
        WHERE (principio_a = ? AND principio_b IN (?)) 
           OR (principio_b = ? AND principio_a IN (?))
      `,
        [
          principioNuevo,
          principiosActuales,
          principioNuevo,
          principiosActuales,
        ],
      );

      // Si hay riesgo alto o crítico, abortamos la transacción
      const alertasCriticas = interacciones.filter(
        (i) => i.nivel_riesgo === "alto" || i.nivel_riesgo === "critico",
      );

      if (alertasCriticas.length > 0) {
        await conn.rollback();
        return res.status(409).json({
          ok: false,
          mensaje: "¡ALERTA MÉDICA! Se detectó una interacción peligrosa.",
          detalles: alertasCriticas,
        });
      }
    }

    // --- B) GUARDAR LA RECETA ---
    const [result] = await conn.query(
      `
      INSERT INTO prescripcion (id_paciente, id_medico, id_medicamento, dosis_instruccion, patron_horario, stock_estimado, activa)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `,
      [
        id_paciente,
        id_medico,
        id_medicamento,
        dosis_instruccion,
        patron_horario,
        stock_estimado || 0,
      ],
    );

    const id_prescripcion = result.insertId;

    // --- C) GENERADOR DE RECORDATORIOS (Automatización) ---
    // Simulamos la creación de las tomas para los próximos 3 días
    let horasDeToma = [];
    if (patron_horario === "cada_8_horas")
      horasDeToma = [8, 16, 24]; // 3 veces al día
    else if (patron_horario === "cada_12_horas")
      horasDeToma = [9, 21]; // 2 veces al día
    else horasDeToma = [9]; // diario (1 vez al día a las 9 am) por defecto

    for (let i = 0; i < 3; i++) {
      // Proyectamos 3 días en el futuro
      for (let hora of horasDeToma) {
        const fechaToma = new Date();
        fechaToma.setDate(fechaToma.getDate() + i);
        fechaToma.setHours(hora, 0, 0, 0);

        await conn.query(
          `
                INSERT INTO toma_recordatorio (id_prescripcion, fecha_hora_programada, estatus)
                VALUES (?, ?, 'pendiente')
            `,
          [id_prescripcion, fechaToma],
        );
      }
    }

    // Si todo salió bien, guardamos en la base de datos de verdad
    await conn.commit();
    return res.status(201).json({
      ok: true,
      mensaje:
        "Prescripción creada de forma segura y recordatorios programados.",
      id_prescripcion,
    });
  } catch (error) {
    await conn.rollback(); // Si algo falla, deshacemos todo para no dejar basura
    console.error("Error prescribiendo:", error.message);
    return res
      .status(500)
      .json({
        ok: false,
        mensaje: error.message || "Error interno del servidor.",
      });
  } finally {
    conn.release();
  }
};

// 3. Ver el historial del paciente
const obtenerPrescripcionesPaciente = async (req, res) => {
  const { id_paciente } = req.params;
  try {
    const [prescripciones] = await pool.query(
      `
      SELECT p.id_prescripcion, p.dosis_instruccion, p.patron_horario, p.stock_estimado, 
             mc.nombre_comercial, mc.principio_activo, mc.presentacion
      FROM prescripcion p
      JOIN medicamento_catalogo mc ON p.id_medicamento = mc.id_medicamento
      WHERE p.id_paciente = ? AND p.activa = 1
    `,
      [id_paciente],
    );

    return res.status(200).json({ ok: true, prescripciones });
  } catch (error) {
    console.error("Error obteniendo prescripciones:", error.message);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
};

module.exports = {
  obtenerCatalogo,
  prescribirMedicamento,
  obtenerPrescripcionesPaciente,
};
