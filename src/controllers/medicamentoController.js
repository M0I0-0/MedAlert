const { pool } = require("../database/connection");

function normalizarPatron(patron = "") {
  return String(patron).trim().toLowerCase().replace(/\s+/g, "_");
}

function generarHorasPorPatron(patron) {
  switch (normalizarPatron(patron)) {
    case "cada_8_horas":
      return [8, 16, 0];
    case "cada_12_horas":
      return [9, 21];
    case "solo_fines_de_semana":
    case "fines_de_semana":
      return [9];
    case "dias_alternos":
      return [9];
    case "diario_noche":
      return [21];
    case "diario_con_alimentos":
      return [8, 20];
    case "antes_de_comida":
      return [7, 13, 19];
    default:
      return [9];
  }
}

function patronIncluyeFecha(patron, fecha, indiceDia) {
  const dia = fecha.getDay();
  switch (normalizarPatron(patron)) {
    case "solo_fines_de_semana":
    case "fines_de_semana":
      return dia === 0 || dia === 6;
    case "dias_alternos":
      return indiceDia % 2 === 0;
    default:
      return true;
  }
}

function formatearDateTimeLocal(fecha) {
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

async function obtenerPacienteBasico(conn, idPaciente) {
  const [rows] = await conn.query(
    `
      SELECT p.*, m.nombre_completo AS medico_nombre
      FROM paciente p
      JOIN medico m ON m.id_medico = p.id_medico
      WHERE p.id_paciente = ?
      LIMIT 1
    `,
    [idPaciente],
  );
  return rows[0] || null;
}

async function puedeVerPaciente({ conn, usuario, idPaciente }) {
  if (usuario.rol === "farmaceutico") return true;

  if (usuario.rol === "paciente") {
    return Number(usuario.id) === Number(idPaciente);
  }

  if (usuario.rol === "medico") {
    const [rows] = await conn.query(
      `SELECT 1 FROM paciente WHERE id_paciente = ? AND id_medico = ? LIMIT 1`,
      [idPaciente, usuario.id],
    );
    return rows.length > 0;
  }

  if (usuario.rol === "familiar") {
    const [rows] = await conn.query(
      `
        SELECT 1
        FROM familiar_paciente
        WHERE id_familiar = ? AND id_paciente = ?
        LIMIT 1
      `,
      [usuario.id, idPaciente],
    );
    return rows.length > 0;
  }

  return false;
}

async function asegurarAccesoPaciente(req, res, idPaciente) {
  const conn = await pool.getConnection();
  try {
    const permitido = await puedeVerPaciente({
      conn,
      usuario: req.usuario,
      idPaciente,
    });
    if (!permitido) {
      res.status(403).json({
        ok: false,
        mensaje: "No tienes permiso para acceder a este paciente.",
      });
      return null;
    }
    return conn;
  } catch (error) {
    conn.release();
    res.status(500).json({ ok: false, mensaje: "Error interno del servidor." });
    return null;
  }
}

async function recrearRecordatorios(conn, prescripcion) {
  await conn.query(
    `
      DELETE FROM toma_recordatorio
      WHERE id_prescripcion = ?
        AND estatus = 'pendiente'
        AND fecha_hora_programada >= NOW()
    `,
    [prescripcion.id_prescripcion],
  );

  const horasDeToma = generarHorasPorPatron(prescripcion.patron_horario);
  const duracionDias = Number(prescripcion.duracion_dias || 7);

  for (let i = 0; i < duracionDias; i += 1) {
    const fechaBase = new Date();
    fechaBase.setDate(fechaBase.getDate() + i);
    if (!patronIncluyeFecha(prescripcion.patron_horario, fechaBase, i)) {
      continue;
    }

    for (const hora of horasDeToma) {
      const fechaToma = new Date(fechaBase);
      fechaToma.setHours(hora, 0, 0, 0);

      await conn.query(
        `
          INSERT INTO toma_recordatorio (id_prescripcion, fecha_hora_programada, estatus)
          VALUES (?, ?, 'pendiente')
        `,
        [prescripcion.id_prescripcion, formatearDateTimeLocal(fechaToma)],
      );
    }
  }
}

async function guardarHistorial(conn, prescripcion, accion, medicoId) {
  await conn.query(
    `
      INSERT INTO historial_prescripcion
      (id_prescripcion, id_medico_editor, dosis_anterior, patron_anterior, stock_anterior, accion)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      prescripcion.id_prescripcion,
      medicoId,
      prescripcion.dosis_instruccion || null,
      prescripcion.patron_horario || null,
      prescripcion.stock_estimado ?? null,
      accion,
    ],
  );
}

async function obtenerCatalogo(_req, res) {
  try {
    const [medicamentos] = await pool.query(
      `
        SELECT mc.*, f.nombre_completo AS farmaceutico
        FROM medicamento_catalogo mc
        JOIN farmaceutico f ON f.id_farmaceutico = mc.id_farmaceutico
        ORDER BY mc.nombre_comercial ASC
      `,
    );
    return res.json({ ok: true, medicamentos });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
}

async function obtenerPacientes(req, res) {
  try {
    let query = "";
    let params = [];

    if (req.usuario.rol === "medico") {
      query = `
        SELECT
          p.id_paciente,
          p.nombre_completo,
          p.edad,
          p.peso_kg,
          p.estatura_cm,
          p.alergias,
          p.historial_clinico,
          COALESCE(v.porcentaje_adherencia, 0) AS porcentaje_adherencia,
          COALESCE(v.omitidos, 0) AS omitidos
        FROM paciente p
        LEFT JOIN vista_metricas_paciente v ON v.id_paciente = p.id_paciente
        WHERE p.id_medico = ?
        ORDER BY p.nombre_completo ASC
      `;
      params = [req.usuario.id];
    } else if (req.usuario.rol === "familiar") {
      query = `
        SELECT
          p.id_paciente,
          p.nombre_completo,
          p.edad,
          p.peso_kg,
          p.estatura_cm,
          p.alergias,
          p.historial_clinico,
          COALESCE(v.porcentaje_adherencia, 0) AS porcentaje_adherencia,
          COALESCE(v.omitidos, 0) AS omitidos
        FROM familiar_paciente fp
        JOIN paciente p ON p.id_paciente = fp.id_paciente
        LEFT JOIN vista_metricas_paciente v ON v.id_paciente = p.id_paciente
        WHERE fp.id_familiar = ?
        ORDER BY p.nombre_completo ASC
      `;
      params = [req.usuario.id];
    } else {
      return res.status(403).json({
        ok: false,
        mensaje: "Solo médicos y familiares pueden listar pacientes.",
      });
    }

    const [pacientes] = await pool.query(query, params);
    return res.status(200).json({ ok: true, pacientes });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
}

async function prescribirMedicamento(req, res) {
  const idMedico = req.usuario.id;
  const {
    id_paciente,
    id_medicamento,
    dosis_instruccion,
    patron_horario,
    duracion_dias,
    indicaciones,
    stock_estimado,
  } = req.body;

  if (!id_paciente || !id_medicamento || !dosis_instruccion || !patron_horario) {
    return res
      .status(400)
      .json({ ok: false, mensaje: "Faltan datos de la prescripción." });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const paciente = await obtenerPacienteBasico(conn, id_paciente);
    if (!paciente) {
      throw new Error("Paciente no encontrado.");
    }
    if (Number(paciente.id_medico) !== Number(idMedico)) {
      return res.status(403).json({
        ok: false,
        mensaje: "Solo el médico asignado puede modificar este tratamiento.",
      });
    }

    const [nuevoMed] = await conn.query(
      `SELECT principio_activo FROM medicamento_catalogo WHERE id_medicamento = ?`,
      [id_medicamento],
    );
    if (nuevoMed.length === 0) {
      throw new Error("Medicamento no existe en el catálogo.");
    }
    const principioNuevo = nuevoMed[0].principio_activo;

    const [activos] = await conn.query(
      `
        SELECT mc.principio_activo
        FROM prescripcion p
        JOIN medicamento_catalogo mc ON p.id_medicamento = mc.id_medicamento
        WHERE p.id_paciente = ? AND p.activa = 1
      `,
      [id_paciente],
    );

    const principiosActuales = activos.map((item) => item.principio_activo);
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

      const alertasCriticas = interacciones.filter(
        (item) => item.nivel_riesgo === "alto" || item.nivel_riesgo === "critico",
      );

      if (alertasCriticas.length > 0) {
        await conn.rollback();
        return res.status(409).json({
          ok: false,
          mensaje: "Se detectó una interacción médica peligrosa.",
          detalles: alertasCriticas,
        });
      }
    }

    const patronNormalizado = normalizarPatron(patron_horario);
    const [result] = await conn.query(
      `
        INSERT INTO prescripcion
        (id_paciente, id_medico, id_medicamento, dosis_instruccion, patron_horario, duracion_dias, indicaciones, stock_estimado, activa)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `,
      [
        id_paciente,
        idMedico,
        id_medicamento,
        dosis_instruccion,
        patronNormalizado,
        Number(duracion_dias || 7),
        indicaciones || null,
        Number(stock_estimado || 0),
      ],
    );

    const prescripcion = {
      id_prescripcion: result.insertId,
      dosis_instruccion,
      patron_horario: patronNormalizado,
      duracion_dias: Number(duracion_dias || 7),
      stock_estimado: Number(stock_estimado || 0),
    };

    await recrearRecordatorios(conn, prescripcion);
    await guardarHistorial(conn, prescripcion, "creacion", idMedico);

    await conn.commit();
    return res.status(201).json({
      ok: true,
      mensaje: "Prescripción creada y recordatorios programados.",
      id_prescripcion: result.insertId,
    });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({
      ok: false,
      mensaje: error.message || "Error interno del servidor.",
    });
  } finally {
    conn.release();
  }
}

async function actualizarPrescripcion(req, res) {
  const { id_prescripcion } = req.params;
  const {
    dosis_instruccion,
    patron_horario,
    duracion_dias,
    indicaciones,
    stock_estimado,
  } = req.body;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `
        SELECT p.*
        FROM prescripcion p
        JOIN paciente pa ON pa.id_paciente = p.id_paciente
        WHERE p.id_prescripcion = ? AND pa.id_medico = ?
        LIMIT 1
      `,
      [id_prescripcion, req.usuario.id],
    );

    const actual = rows[0];
    if (!actual) {
      await conn.rollback();
      return res.status(404).json({
        ok: false,
        mensaje: "Prescripción no encontrada o sin permisos.",
      });
    }

    await guardarHistorial(conn, actual, "actualizacion", req.usuario.id);

    const siguiente = {
      ...actual,
      dosis_instruccion: dosis_instruccion || actual.dosis_instruccion,
      patron_horario: normalizarPatron(patron_horario || actual.patron_horario),
      duracion_dias: Number(duracion_dias || actual.duracion_dias || 7),
      indicaciones: indicaciones ?? actual.indicaciones,
      stock_estimado:
        stock_estimado === undefined
          ? Number(actual.stock_estimado || 0)
          : Number(stock_estimado),
    };

    await conn.query(
      `
        UPDATE prescripcion
        SET dosis_instruccion = ?, patron_horario = ?, duracion_dias = ?, indicaciones = ?,
            stock_estimado = ?, version = version + 1
        WHERE id_prescripcion = ?
      `,
      [
        siguiente.dosis_instruccion,
        siguiente.patron_horario,
        siguiente.duracion_dias,
        siguiente.indicaciones,
        siguiente.stock_estimado,
        id_prescripcion,
      ],
    );

    await recrearRecordatorios(conn, siguiente);
    await conn.commit();
    return res.json({
      ok: true,
      mensaje: "Prescripción actualizada correctamente.",
    });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({ ok: false, mensaje: "Error interno del servidor." });
  } finally {
    conn.release();
  }
}

async function desactivarPrescripcion(req, res) {
  const { id_prescripcion } = req.params;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `
        SELECT p.*
        FROM prescripcion p
        JOIN paciente pa ON pa.id_paciente = p.id_paciente
        WHERE p.id_prescripcion = ? AND pa.id_medico = ?
        LIMIT 1
      `,
      [id_prescripcion, req.usuario.id],
    );

    const actual = rows[0];
    if (!actual) {
      await conn.rollback();
      return res.status(404).json({
        ok: false,
        mensaje: "Prescripción no encontrada o sin permisos.",
      });
    }

    await guardarHistorial(conn, actual, "desactivacion", req.usuario.id);
    await conn.query(
      `UPDATE prescripcion SET activa = 0 WHERE id_prescripcion = ?`,
      [id_prescripcion],
    );
    await conn.query(
      `
        UPDATE toma_recordatorio
        SET estatus = 'no_cumplido', motivo_omision = 'decision_medica', omision_justificada = 1
        WHERE id_prescripcion = ? AND estatus = 'pendiente'
      `,
      [id_prescripcion],
    );

    await conn.commit();
    return res.json({ ok: true, mensaje: "Prescripción desactivada." });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({ ok: false, mensaje: "Error interno del servidor." });
  } finally {
    conn.release();
  }
}

async function obtenerPrescripcionesPaciente(req, res) {
  const { id_paciente } = req.params;
  const conn = await asegurarAccesoPaciente(req, res, id_paciente);
  if (!conn) return;

  try {
    const [prescripciones] = await conn.query(
      `
        SELECT
          p.id_prescripcion,
          p.id_paciente,
          p.dosis_instruccion,
          p.patron_horario,
          p.duracion_dias,
          p.indicaciones,
          p.stock_estimado,
          p.ultima_dispensacion,
          p.version,
          mc.nombre_comercial,
          mc.principio_activo,
          mc.presentacion,
          COUNT(t.id_toma) AS total_tomas,
          SUM(t.estatus = 'cumplido') AS tomas_cumplidas,
          MIN(CASE WHEN t.estatus = 'pendiente' THEN t.fecha_hora_programada END) AS proxima_toma
        FROM prescripcion p
        JOIN medicamento_catalogo mc ON p.id_medicamento = mc.id_medicamento
        LEFT JOIN toma_recordatorio t ON t.id_prescripcion = p.id_prescripcion
        WHERE p.id_paciente = ? AND p.activa = 1
        GROUP BY
          p.id_prescripcion, p.id_paciente, p.dosis_instruccion, p.patron_horario,
          p.duracion_dias, p.indicaciones, p.stock_estimado, p.ultima_dispensacion,
          p.version, mc.nombre_comercial, mc.principio_activo, mc.presentacion
        ORDER BY proxima_toma IS NULL, proxima_toma ASC, mc.nombre_comercial ASC
      `,
      [id_paciente],
    );

    const enrich = prescripciones.map((item) => ({
      ...item,
      porcentaje_adherencia: Number(item.total_tomas)
        ? Math.round((Number(item.tomas_cumplidas || 0) / Number(item.total_tomas)) * 100)
        : 0,
    }));

    return res.status(200).json({ ok: true, prescripciones: enrich });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  } finally {
    conn.release();
  }
}

async function obtenerTomasPaciente(req, res) {
  const { id_paciente } = req.params;
  const conn = await asegurarAccesoPaciente(req, res, id_paciente);
  if (!conn) return;

  try {
    const [tomas] = await conn.query(
      `
        SELECT
          t.id_toma,
          t.fecha_hora_programada,
          t.fecha_hora_real,
          t.estatus,
          t.motivo_omision,
          t.omision_justificada,
          t.observaciones,
          p.id_prescripcion,
          p.indicaciones,
          mc.nombre_comercial,
          mc.principio_activo
        FROM toma_recordatorio t
        JOIN prescripcion p ON p.id_prescripcion = t.id_prescripcion
        JOIN medicamento_catalogo mc ON mc.id_medicamento = p.id_medicamento
        WHERE p.id_paciente = ?
        ORDER BY t.fecha_hora_programada DESC
        LIMIT 30
      `,
      [id_paciente],
    );

    return res.json({ ok: true, tomas });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  } finally {
    conn.release();
  }
}

async function obtenerResumenPaciente(req, res) {
  const { id_paciente } = req.params;
  const conn = await asegurarAccesoPaciente(req, res, id_paciente);
  if (!conn) return;

  try {
    const paciente = await obtenerPacienteBasico(conn, id_paciente);
    if (!paciente) {
      return res.status(404).json({ ok: false, mensaje: "Paciente no encontrado." });
    }

    const [metricasRows] = await conn.query(
      `
        SELECT *
        FROM vista_metricas_paciente
        WHERE id_paciente = ?
        LIMIT 1
      `,
      [id_paciente],
    );

    const [semanalRows] = await conn.query(
      `
        SELECT
          SUM(CASE WHEN t.fecha_hora_programada >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS total_semana,
          SUM(CASE WHEN t.fecha_hora_programada >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND t.estatus = 'cumplido' THEN 1 ELSE 0 END) AS cumplido_semana,
          SUM(CASE WHEN t.fecha_hora_programada >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND t.fecha_hora_programada < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS total_semana_anterior,
          SUM(CASE WHEN t.fecha_hora_programada >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND t.fecha_hora_programada < DATE_SUB(NOW(), INTERVAL 7 DAY) AND t.estatus = 'cumplido' THEN 1 ELSE 0 END) AS cumplido_semana_anterior
        FROM toma_recordatorio t
        JOIN prescripcion p ON p.id_prescripcion = t.id_prescripcion
        WHERE p.id_paciente = ?
      `,
      [id_paciente],
    );

    const [proximaRows] = await conn.query(
      `
        SELECT
          t.fecha_hora_programada,
          mc.nombre_comercial
        FROM toma_recordatorio t
        JOIN prescripcion p ON p.id_prescripcion = t.id_prescripcion
        JOIN medicamento_catalogo mc ON mc.id_medicamento = p.id_medicamento
        WHERE p.id_paciente = ? AND t.estatus = 'pendiente'
        ORDER BY t.fecha_hora_programada ASC
        LIMIT 1
      `,
      [id_paciente],
    );

    const metricas = metricasRows[0] || {};
    const semanal = semanalRows[0] || {};
    const actual = Number(semanal.total_semana)
      ? Math.round((Number(semanal.cumplido_semana || 0) / Number(semanal.total_semana)) * 100)
      : 0;
    const anterior = Number(semanal.total_semana_anterior)
      ? Math.round(
          (Number(semanal.cumplido_semana_anterior || 0) /
            Number(semanal.total_semana_anterior)) *
            100,
        )
      : 0;

    return res.json({
      ok: true,
      paciente,
      metricas: {
        total: Number(metricas.total || 0),
        cumplidos: Number(metricas.cumplidos || 0),
        omitidos: Number(metricas.omitidos || 0),
        pendientes: Number(metricas.pendientes || 0),
        porcentaje_adherencia: Number(metricas.porcentaje_adherencia || 0),
      },
      comparativo: {
        semana_actual: actual,
        semana_anterior: anterior,
      },
      proxima_toma: proximaRows[0] || null,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  } finally {
    conn.release();
  }
}

async function marcarToma(req, res) {
  const { id_toma } = req.params;
  const {
    estatus,
    motivo_omision,
    observaciones,
    fecha_hora_real,
    omision_justificada,
  } = req.body;

  if (!["cumplido", "no_cumplido"].includes(estatus)) {
    return res.status(400).json({
      ok: false,
      mensaje: "El estatus debe ser 'cumplido' o 'no_cumplido'.",
    });
  }

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `
        SELECT t.*, p.id_paciente
        FROM toma_recordatorio t
        JOIN prescripcion p ON p.id_prescripcion = t.id_prescripcion
        WHERE t.id_toma = ?
        LIMIT 1
      `,
      [id_toma],
    );

    const toma = rows[0];
    if (!toma) {
      return res.status(404).json({ ok: false, mensaje: "Toma no encontrada." });
    }

    const permitido = await puedeVerPaciente({
      conn,
      usuario: req.usuario,
      idPaciente: toma.id_paciente,
    });
    if (!permitido) {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permiso para registrar esta toma.",
      });
    }

    const fechaReal =
      estatus === "cumplido"
        ? fecha_hora_real || formatearDateTimeLocal(new Date())
        : null;

    await conn.query(
      `
        UPDATE toma_recordatorio
        SET fecha_hora_real = ?, estatus = ?, motivo_omision = ?, omision_justificada = ?, observaciones = ?
        WHERE id_toma = ?
      `,
      [
        fechaReal,
        estatus,
        estatus === "no_cumplido" ? motivo_omision || "otro" : null,
        estatus === "no_cumplido" ? Number(Boolean(omision_justificada)) : 0,
        observaciones || null,
        id_toma,
      ],
    );

    return res.json({ ok: true, mensaje: "Toma actualizada correctamente." });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  } finally {
    conn.release();
  }
}

async function dispensarPrescripcion(req, res) {
  const { id_prescripcion } = req.params;
  const cantidad = Number(req.body.cantidad || 30);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT * FROM prescripcion WHERE id_prescripcion = ? LIMIT 1`,
      [id_prescripcion],
    );
    const prescripcion = rows[0];

    if (!prescripcion) {
      await conn.rollback();
      return res.status(404).json({ ok: false, mensaje: "Prescripción no encontrada." });
    }

    await conn.query(
      `
        UPDATE prescripcion
        SET stock_estimado = stock_estimado + ?, ultima_dispensacion = NOW()
        WHERE id_prescripcion = ?
      `,
      [cantidad, id_prescripcion],
    );

    await guardarHistorial(
      conn,
      prescripcion,
      "dispensacion",
      prescripcion.id_medico,
    );

    await conn.commit();
    return res.json({
      ok: true,
      mensaje: "Medicamento dispensado y stock actualizado.",
    });
  } catch (error) {
    await conn.rollback();
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  } finally {
    conn.release();
  }
}

async function guardarNotaMedica(req, res) {
  const { id_paciente, contenido } = req.body;

  if (!id_paciente || !contenido?.trim()) {
    return res.status(400).json({
      ok: false,
      mensaje: "El paciente y el contenido de la nota son requeridos.",
    });
  }

  const conn = await pool.getConnection();
  try {
    const paciente = await obtenerPacienteBasico(conn, id_paciente);
    if (!paciente || Number(paciente.id_medico) !== Number(req.usuario.id)) {
      return res.status(403).json({
        ok: false,
        mensaje: "Solo el médico asignado puede dejar notas.",
      });
    }

    const [result] = await conn.query(
      `
        INSERT INTO nota_medica (id_paciente, id_medico, contenido)
        VALUES (?, ?, ?)
      `,
      [id_paciente, req.usuario.id, contenido.trim()],
    );

    return res.status(201).json({
      ok: true,
      mensaje: "Nota guardada correctamente.",
      id_nota: result.insertId,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  } finally {
    conn.release();
  }
}

async function obtenerNotasPaciente(req, res) {
  const { id_paciente } = req.params;
  const conn = await asegurarAccesoPaciente(req, res, id_paciente);
  if (!conn) return;

  try {
    const [notas] = await conn.query(
      `
        SELECT n.id_nota, n.contenido, n.created_at, m.nombre_completo AS medico
        FROM nota_medica n
        JOIN medico m ON m.id_medico = n.id_medico
        WHERE n.id_paciente = ?
        ORDER BY n.created_at DESC
      `,
      [id_paciente],
    );
    return res.json({ ok: true, notas });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  } finally {
    conn.release();
  }
}

module.exports = {
  actualizarPrescripcion,
  desactivarPrescripcion,
  dispensarPrescripcion,
  guardarNotaMedica,
  marcarToma,
  obtenerCatalogo,
  obtenerNotasPaciente,
  obtenerPacientes,
  obtenerPrescripcionesPaciente,
  obtenerResumenPaciente,
  obtenerTomasPaciente,
  prescribirMedicamento,
};
