const { pool } = require("../database/connection");
const {
  procesarNotificaciones,
} = require("../services/notificationScheduler");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const adherenciaService = require("../services/adherenciaService");

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

async function crearMedicamentoCatalogo(req, res) {
  const { nombre_comercial, principio_activo, presentacion } = req.body;

  if (!nombre_comercial?.trim() || !principio_activo?.trim()) {
    return res.status(400).json({
      ok: false,
      mensaje: "Nombre comercial y principio activo son requeridos.",
    });
  }

  try {
    const [result] = await pool.query(
      `
        INSERT INTO medicamento_catalogo
        (id_farmaceutico, nombre_comercial, principio_activo, presentacion)
        VALUES (?, ?, ?, ?)
      `,
      [
        req.usuario.id,
        nombre_comercial.trim(),
        principio_activo.trim(),
        presentacion?.trim() || null,
      ],
    );

    return res.status(201).json({
      ok: true,
      mensaje: "Medicamento agregado al catálogo.",
      id_medicamento: result.insertId,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
}

async function actualizarMedicamentoCatalogo(req, res) {
  const { id_medicamento } = req.params;
  const { nombre_comercial, principio_activo, presentacion } = req.body;

  if (!nombre_comercial?.trim() || !principio_activo?.trim()) {
    return res.status(400).json({
      ok: false,
      mensaje: "Nombre comercial y principio activo son requeridos.",
    });
  }

  try {
    const [result] = await pool.query(
      `
        UPDATE medicamento_catalogo
        SET nombre_comercial = ?, principio_activo = ?, presentacion = ?
        WHERE id_medicamento = ?
      `,
      [
        nombre_comercial.trim(),
        principio_activo.trim(),
        presentacion?.trim() || null,
        id_medicamento,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: "Medicamento no encontrado." });
    }

    return res.json({ ok: true, mensaje: "Medicamento actualizado." });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
}

async function eliminarMedicamentoCatalogo(req, res) {
  const { id_medicamento } = req.params;

  try {
    const [uso] = await pool.query(
      `SELECT 1 FROM prescripcion WHERE id_medicamento = ? LIMIT 1`,
      [id_medicamento],
    );
    if (uso.length > 0) {
      return res.status(409).json({
        ok: false,
        mensaje: "No se puede eliminar porque ya tiene prescripciones asociadas.",
      });
    }

    const [result] = await pool.query(
      `DELETE FROM medicamento_catalogo WHERE id_medicamento = ?`,
      [id_medicamento],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: "Medicamento no encontrado." });
    }
    return res.json({ ok: true, mensaje: "Medicamento eliminado." });
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

async function activarPrescripcion(req, res) {
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

    await conn.query(
      `UPDATE prescripcion SET activa = 1 WHERE id_prescripcion = ?`,
      [id_prescripcion],
    );

    await guardarHistorial(conn, actual, "actualizacion", req.usuario.id);

    // Recreamos recordatorios futuros para la receta activada
    await recrearRecordatorios(conn, actual);

    await conn.commit();
    return res.json({ ok: true, mensaje: "Prescripción activada y tomas programadas." });
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
          p.activa,
          mc.nombre_comercial,
          mc.principio_activo,
          mc.presentacion,
          COUNT(t.id_toma) AS total_tomas,
          SUM(t.estatus = 'cumplido') AS tomas_cumplidas,
          MIN(CASE WHEN t.estatus = 'pendiente' THEN t.fecha_hora_programada END) AS proxima_toma
        FROM prescripcion p
        JOIN medicamento_catalogo mc ON p.id_medicamento = mc.id_medicamento
        LEFT JOIN toma_recordatorio t ON t.id_prescripcion = p.id_prescripcion
        WHERE p.id_paciente = ?
        GROUP BY
          p.id_prescripcion, p.id_paciente, p.dosis_instruccion, p.patron_horario,
          p.duracion_dias, p.indicaciones, p.stock_estimado, p.ultima_dispensacion,
          p.version, p.activa, mc.nombre_comercial, mc.principio_activo, mc.presentacion
        ORDER BY
          MIN(CASE WHEN t.estatus = 'pendiente' THEN t.fecha_hora_programada END) IS NULL,
          MIN(CASE WHEN t.estatus = 'pendiente' THEN t.fecha_hora_programada END) ASC,
          mc.nombre_comercial ASC
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

async function obtenerNotificacionesPaciente(req, res) {
  const { id_paciente } = req.params;
  const conn = await asegurarAccesoPaciente(req, res, id_paciente);
  if (!conn) return;

  try {
    const [notificaciones] = await conn.query(
      `
        SELECT
          n.id_notificacion,
          n.id_toma,
          n.tipo,
          n.etapa,
          n.mensaje,
          n.programada_para,
          n.enviada_en,
          n.leida_en,
          n.estado,
          mc.nombre_comercial
        FROM notificacion_recordatorio n
        JOIN toma_recordatorio t ON t.id_toma = n.id_toma
        JOIN prescripcion p ON p.id_prescripcion = t.id_prescripcion
        JOIN medicamento_catalogo mc ON mc.id_medicamento = p.id_medicamento
        WHERE p.id_paciente = ?
        ORDER BY n.programada_para DESC
        LIMIT 30
      `,
      [id_paciente],
    );

    return res.json({ ok: true, notificaciones });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  } finally {
    conn.release();
  }
}

async function confirmarLecturaNotificacion(req, res) {
  const { id_notificacion } = req.params;
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      `
        SELECT p.id_paciente
        FROM notificacion_recordatorio n
        JOIN toma_recordatorio t ON t.id_toma = n.id_toma
        JOIN prescripcion pr ON pr.id_prescripcion = t.id_prescripcion
        JOIN paciente p ON p.id_paciente = pr.id_paciente
        WHERE n.id_notificacion = ?
        LIMIT 1
      `,
      [id_notificacion],
    );
    const item = rows[0];
    if (!item) {
      return res.status(404).json({ ok: false, mensaje: "Notificación no encontrada." });
    }

    const permitido = await puedeVerPaciente({
      conn,
      usuario: req.usuario,
      idPaciente: item.id_paciente,
    });
    if (!permitido) {
      return res.status(403).json({ ok: false, mensaje: "Sin permiso." });
    }

    await conn.query(
      `
        UPDATE notificacion_recordatorio
        SET estado = 'leida', leida_en = NOW()
        WHERE id_notificacion = ?
      `,
      [id_notificacion],
    );
    return res.json({ ok: true, mensaje: "Lectura confirmada." });
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
        SET fecha_hora_real = ?, estatus = ?, motivo_omision = ?, omision_justificada = ?,
            observaciones = ?, registrado_por_rol = ?, registrado_por_id = ?, modo_registro = 'normal'
        WHERE id_toma = ?
      `,
      [
        fechaReal,
        estatus,
        estatus === "no_cumplido" ? motivo_omision || "otro" : null,
        estatus === "no_cumplido" ? Number(Boolean(omision_justificada)) : 0,
        observaciones || null,
        req.usuario.rol,
        req.usuario.id,
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

async function marcarTomasLoteHospitalario(req, res) {
  const { tomas, registrado_por } = req.body;
  if (!Array.isArray(tomas) || tomas.length === 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "Debes enviar una lista de tomas.",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let actualizadas = 0;

    for (const item of tomas) {
      if (!item.id_toma || !["cumplido", "no_cumplido"].includes(item.estatus)) {
        continue;
      }

      const [rows] = await conn.query(
        `
          SELECT t.*, p.id_paciente
          FROM toma_recordatorio t
          JOIN prescripcion p ON p.id_prescripcion = t.id_prescripcion
          JOIN paciente pa ON pa.id_paciente = p.id_paciente
          WHERE t.id_toma = ? AND pa.id_medico = ?
          LIMIT 1
        `,
        [item.id_toma, req.usuario.id],
      );
      if (rows.length === 0) continue;

      const fechaReal =
        item.estatus === "cumplido"
          ? item.fecha_hora_real || formatearDateTimeLocal(new Date())
          : null;

      await conn.query(
        `
          UPDATE toma_recordatorio
          SET fecha_hora_real = ?, estatus = ?, motivo_omision = ?, omision_justificada = ?,
              observaciones = ?, registrado_por_rol = 'enfermero',
              registrado_por_id = ?, modo_registro = 'hospitalario'
          WHERE id_toma = ?
        `,
        [
          fechaReal,
          item.estatus,
          item.estatus === "no_cumplido" ? item.motivo_omision || "otro" : null,
          item.estatus === "no_cumplido" ? Number(Boolean(item.omision_justificada)) : 0,
          item.observaciones || registrado_por || "Registro hospitalario en lote",
          req.usuario.id,
          item.id_toma,
        ],
      );
      actualizadas += 1;
    }

    await conn.commit();
    return res.json({
      ok: true,
      mensaje: `${actualizadas} tomas registradas en modo hospitalario.`,
      actualizadas,
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

async function obtenerHistorialPrescripcion(req, res) {
  const { id_prescripcion } = req.params;
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      `
        SELECT p.id_paciente
        FROM prescripcion p
        WHERE p.id_prescripcion = ?
        LIMIT 1
      `,
      [id_prescripcion],
    );
    const prescripcion = rows[0];
    if (!prescripcion) {
      return res.status(404).json({ ok: false, mensaje: "Prescripción no encontrada." });
    }

    const permitido = await puedeVerPaciente({
      conn,
      usuario: req.usuario,
      idPaciente: prescripcion.id_paciente,
    });
    if (!permitido) {
      return res.status(403).json({ ok: false, mensaje: "Sin permiso." });
    }

    const [historial] = await conn.query(
      `
        SELECT
          h.*,
          m.nombre_completo AS medico_editor
        FROM historial_prescripcion h
        JOIN medico m ON m.id_medico = h.id_medico_editor
        WHERE h.id_prescripcion = ?
        ORDER BY h.fecha_modificacion DESC
      `,
      [id_prescripcion],
    );

    return res.json({ ok: true, historial });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  } finally {
    conn.release();
  }
}

async function obtenerAlertasStock(req, res) {
  try {
    let filtro = "";
    const params = [];

    if (req.usuario.rol === "medico") {
      filtro = "AND pa.id_medico = ?";
      params.push(req.usuario.id);
    } else if (req.usuario.rol === "paciente") {
      filtro = "AND pa.id_paciente = ?";
      params.push(req.usuario.id);
    } else if (req.usuario.rol === "familiar") {
      filtro = "AND EXISTS (SELECT 1 FROM familiar_paciente fp WHERE fp.id_paciente = pa.id_paciente AND fp.id_familiar = ?)";
      params.push(req.usuario.id);
    }

    const [alertas] = await pool.query(
      `
        SELECT
          pr.id_prescripcion,
          pa.id_paciente,
          pa.nombre_completo AS paciente,
          mc.nombre_comercial,
          pr.stock_estimado,
          MIN(CASE WHEN t.estatus = 'pendiente' THEN t.fecha_hora_programada END) AS proxima_toma
        FROM prescripcion pr
        JOIN paciente pa ON pa.id_paciente = pr.id_paciente
        JOIN medicamento_catalogo mc ON mc.id_medicamento = pr.id_medicamento
        LEFT JOIN toma_recordatorio t ON t.id_prescripcion = pr.id_prescripcion
        WHERE pr.activa = 1
          AND pr.stock_estimado <= 5
          ${filtro}
        GROUP BY pr.id_prescripcion, pa.id_paciente, pa.nombre_completo, mc.nombre_comercial, pr.stock_estimado
        ORDER BY
          pr.stock_estimado ASC,
          MIN(CASE WHEN t.estatus = 'pendiente' THEN t.fecha_hora_programada END) ASC
      `,
      params,
    );

    return res.json({ ok: true, alertas });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
}

async function procesarNotificacionesManual(_req, res) {
  try {
    const enviadas = await procesarNotificaciones();
    return res.json({
      ok: true,
      mensaje: `${enviadas} notificaciones SMS simuladas procesadas.`,
      enviadas,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error procesando notificaciones." });
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

// ─── Helpers de reporte ───────────────────────────────────────────────────────
async function obtenerDatosReporte(conn, idPaciente) {
  const paciente = await obtenerPacienteBasico(conn, idPaciente);

  const [metricasRows] = await conn.query(
    `SELECT * FROM vista_metricas_paciente WHERE id_paciente = ? LIMIT 1`,
    [idPaciente],
  );

  const [prescripciones] = await conn.query(
    `
      SELECT
        p.id_prescripcion,
        p.dosis_instruccion,
        p.patron_horario,
        p.duracion_dias,
        p.indicaciones,
        p.stock_estimado,
        mc.nombre_comercial,
        mc.principio_activo,
        mc.presentacion,
        COUNT(t.id_toma) AS total_tomas,
        SUM(t.estatus = 'cumplido') AS tomas_cumplidas
      FROM prescripcion p
      JOIN medicamento_catalogo mc ON p.id_medicamento = mc.id_medicamento
      LEFT JOIN toma_recordatorio t ON t.id_prescripcion = p.id_prescripcion
      WHERE p.id_paciente = ? AND p.activa = 1
      GROUP BY p.id_prescripcion, p.dosis_instruccion, p.patron_horario,
        p.duracion_dias, p.indicaciones, p.stock_estimado,
        mc.nombre_comercial, mc.principio_activo, mc.presentacion
      ORDER BY mc.nombre_comercial ASC
    `,
    [idPaciente],
  );

  const [tomas] = await conn.query(
    `
      SELECT
        t.fecha_hora_programada,
        t.fecha_hora_real,
        t.estatus,
        t.motivo_omision,
        t.observaciones,
        mc.nombre_comercial
      FROM toma_recordatorio t
      JOIN prescripcion p ON p.id_prescripcion = t.id_prescripcion
      JOIN medicamento_catalogo mc ON mc.id_medicamento = p.id_medicamento
      WHERE p.id_paciente = ?
      ORDER BY t.fecha_hora_programada DESC
      LIMIT 30
    `,
    [idPaciente],
  );

  const metricas = metricasRows[0] || {};
  return { paciente, metricas, prescripciones, tomas };
}

function fmtFecha(val) {
  if (!val) return "Sin dato";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(val));
}

// ─── Exportar reporte PDF ─────────────────────────────────────────────────────
async function exportarReportePDF(req, res) {
  const { id_paciente } = req.params;
  const conn = await asegurarAccesoPaciente(req, res, id_paciente);
  if (!conn) return;

  try {
    const { paciente, metricas, prescripciones, tomas } =
      await obtenerDatosReporte(conn, id_paciente);

    if (!paciente) {
      return res.status(404).json({ ok: false, mensaje: "Paciente no encontrado." });
    }

    const nombreArchivo = `reporte_${(paciente.nombre_completo || "paciente")
      .replace(/\s+/g, "_")
      .toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreArchivo}"`,
    );

    const doc = new PDFDocument({
      bufferPages: true,
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Reporte MedAlert – ${paciente.nombre_completo}`,
        Author: "MedAlert",
        Subject: "Reporte de evolución clínica",
      },
    });

    doc.on("error", (err) => {
      console.error("Error en PDFDocument:", err);
    });

    res.on("close", () => {
      doc.unpipe(res);
      doc.end();
    });

    doc.pipe(res);

    // ── Paleta de colores ──
    const AZUL_OSCURO = "#0f172a";
    const AZUL_PRIMARIO = "#3b82f6";
    const AZUL_CLARO = "#dbeafe";
    const VERDE = "#16a34a";
    const ROJO = "#dc2626";
    const GRIS_TEXTO = "#475569";
    const GRIS_BG = "#f8fafc";
    const BLANCO = "#ffffff";

    const W = doc.page.width - 100; // ancho útil

    // ── Cabecera ──
    doc.rect(0, 0, doc.page.width, 80).fill(AZUL_OSCURO);
    doc
      .fillColor(BLANCO)
      .fontSize(22)
      .font("Helvetica-Bold")
      .text("MedAlert", 50, 20, { continued: true })
      .fillColor(AZUL_PRIMARIO)
      .text(" · Reporte de Evolución Clínica");
    doc
      .fillColor("#94a3b8")
      .fontSize(10)
      .font("Helvetica")
      .text(`Generado el ${fmtFecha(new Date())}`, 50, 52);

    doc.moveDown(3);

    // ── Sección: Datos del paciente ──
    const yDatos = doc.y;
    doc.rect(50, yDatos, W, 16).fill(AZUL_PRIMARIO);
    doc
      .fillColor(BLANCO)
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("  Datos del Paciente", 50, yDatos + 3);
    doc.moveDown(0.3);

    doc.rect(50, doc.y, W, 140).fill(GRIS_BG).stroke("#e2e8f0");
    const yInfoStart = doc.y + 8;

    const col1 = 60;
    const col2 = 310;
    let yRow = yInfoStart;

    function infoRow(label, value, x, y) {
      doc.fillColor(GRIS_TEXTO).fontSize(9).font("Helvetica-Bold").text(label, x, y);
      doc
        .fillColor(AZUL_OSCURO)
        .fontSize(9)
        .font("Helvetica")
        .text(String(value || "Sin dato"), x, y + 11);
    }

    infoRow("Nombre completo", paciente.nombre_completo, col1, yRow);
    infoRow("Médico asignado", paciente.medico_nombre, col2, yRow);
    yRow += 28;
    infoRow("Edad", paciente.edad ? `${paciente.edad} años` : null, col1, yRow);
    infoRow("Correo", paciente.correo, col2, yRow);
    yRow += 28;
    infoRow("Peso", paciente.peso_kg ? `${paciente.peso_kg} kg` : null, col1, yRow);
    infoRow("Teléfono", paciente.telefono, col2, yRow);
    yRow += 28;
    infoRow("Estatura", paciente.estatura_cm ? `${paciente.estatura_cm} cm` : null, col1, yRow);
    infoRow("Alergias", paciente.alergias || "Ninguna registrada", col2, yRow);
    yRow += 28;
    infoRow("Historial clínico", paciente.historial_clinico || "Sin historial", col1, yRow);

    doc.y = yInfoStart + 148;
    doc.moveDown(1);

    // ── Sección: Métricas de adherencia ──
    const adherencia = Number(metricas.porcentaje_adherencia || 0);
    const colorAdh = adherencia >= 80 ? VERDE : adherencia >= 60 ? "#f59e0b" : ROJO;

    const yMet = doc.y;
    doc.rect(50, yMet, W, 16).fill(AZUL_PRIMARIO);
    doc
      .fillColor(BLANCO)
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("  Métricas de Adherencia", 50, yMet + 3);
    doc.y = yMet + 20;

    const cW = W / 5;
    const tarjetas = [
      { label: "Adherencia", valor: `${adherencia}%`, color: colorAdh },
      { label: "Total tomas", valor: String(metricas.total || 0), color: AZUL_PRIMARIO },
      { label: "Cumplidas", valor: String(metricas.cumplidos || 0), color: VERDE },
      { label: "Omitidas", valor: String(metricas.omitidos || 0), color: ROJO },
      { label: "Pendientes", valor: String(metricas.pendientes || 0), color: "#f59e0b" },
    ];

    const yTarj = doc.y;
    tarjetas.forEach((t, i) => {
      const xT = 50 + i * cW;
      doc.rect(xT, yTarj, cW - 2, 60).fill(GRIS_BG).stroke("#e2e8f0");
      doc
        .fillColor(t.color)
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(t.valor, xT, yTarj + 10, { width: cW - 2, align: "center" });
      doc
        .fillColor(GRIS_TEXTO)
        .fontSize(8)
        .font("Helvetica")
        .text(t.label, xT, yTarj + 40, { width: cW - 2, align: "center" });
    });

    doc.y = yTarj + 70;
    doc.moveDown(1);

    // ── Sección: Recetas activas ──
    if (prescripciones.length > 0) {
      const yRec = doc.y;
      doc.rect(50, yRec, W, 16).fill(AZUL_PRIMARIO);
      doc
        .fillColor(BLANCO)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("  Recetas Activas", 50, yRec + 3);
      doc.y = yRec + 20;

      // Cabecera tabla
      const cols = [
        { label: "Medicamento", w: 120 },
        { label: "Dosis", w: 90 },
        { label: "Frecuencia", w: 90 },
        { label: "Días", w: 35 },
        { label: "Stock", w: 35 },
        { label: "Indicaciones", w: 125 },
      ];

      let xCol = 50;
      const yTHead = doc.y;
      doc.rect(50, yTHead, W, 14).fill(AZUL_CLARO);
      cols.forEach((c) => {
        doc
          .fillColor(AZUL_OSCURO)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text(c.label, xCol + 2, yTHead + 3, { width: c.w - 4 });
        xCol += c.w;
      });
      doc.y = yTHead + 16;

      prescripciones.forEach((presc, idx) => {
        if (doc.y > doc.page.height - 100) doc.addPage();
        const yF = doc.y;
        const rowH = 24;
        doc
          .rect(50, yF, W, rowH)
          .fill(idx % 2 === 0 ? BLANCO : GRIS_BG)
          .stroke("#e2e8f0");

        const vals = [
          presc.nombre_comercial,
          presc.dosis_instruccion,
          String(presc.patron_horario || "").replaceAll("_", " "),
          String(presc.duracion_dias || 7),
          String(presc.stock_estimado || 0),
          presc.indicaciones || "Según receta",
        ];
        let xV = 50;
        cols.forEach((c, ci) => {
          doc
            .fillColor(AZUL_OSCURO)
            .fontSize(7.5)
            .font("Helvetica")
            .text(String(vals[ci] || ""), xV + 2, yF + 5, {
              width: c.w - 4,
              lineBreak: false,
            });
          xV += c.w;
        });
        doc.y = yF + rowH;
      });

      doc.moveDown(1);
    }

    // ── Sección: Historial reciente de tomas ──
    if (tomas.length > 0) {
      if (doc.y > doc.page.height - 140) doc.addPage();

      const yHist = doc.y;
      doc.rect(50, yHist, W, 16).fill(AZUL_PRIMARIO);
      doc
        .fillColor(BLANCO)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("  Historial Reciente de Tomas (últimas 30)", 50, yHist + 3);
      doc.y = yHist + 20;

      const colsH = [
        { label: "Medicamento", w: 120 },
        { label: "Programada", w: 115 },
        { label: "Real", w: 115 },
        { label: "Resultado", w: 75 },
        { label: "Motivo", w: 70 },
      ];

      let xColH = 50;
      const yTHeadH = doc.y;
      doc.rect(50, yTHeadH, W, 14).fill(AZUL_CLARO);
      colsH.forEach((c) => {
        doc
          .fillColor(AZUL_OSCURO)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text(c.label, xColH + 2, yTHeadH + 3, { width: c.w - 4 });
        xColH += c.w;
      });
      doc.y = yTHeadH + 16;

      tomas.forEach((toma, idx) => {
        if (doc.y > doc.page.height - 80) doc.addPage();
        const yF = doc.y;
        const rowH = 20;

        const colorEstatus =
          toma.estatus === "cumplido" ? VERDE : toma.estatus === "no_cumplido" ? ROJO : "#f59e0b";

        doc
          .rect(50, yF, W, rowH)
          .fill(idx % 2 === 0 ? BLANCO : GRIS_BG)
          .stroke("#e2e8f0");

        const valsH = [
          toma.nombre_comercial,
          fmtFecha(toma.fecha_hora_programada),
          fmtFecha(toma.fecha_hora_real),
          String(toma.estatus || "").replaceAll("_", " "),
          String(toma.motivo_omision || toma.observaciones || "-").replaceAll("_", " "),
        ];
        let xV = 50;
        colsH.forEach((c, ci) => {
          doc
            .fillColor(ci === 3 ? colorEstatus : AZUL_OSCURO)
            .fontSize(7)
            .font(ci === 3 ? "Helvetica-Bold" : "Helvetica")
            .text(String(valsH[ci] || ""), xV + 2, yF + 5, {
              width: c.w - 4,
              lineBreak: false,
            });
          xV += c.w;
        });
        doc.y = yF + rowH;
      });
    }

    // ── Pie de página ──
    const totalPags = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPags; i++) {
      doc.switchToPage(i);
      doc
        .fillColor("#94a3b8")
        .fontSize(8)
        .font("Helvetica")
        .text(
          `MedAlert – Reporte confidencial | Página ${i + 1} de ${totalPags}`,
          50,
          doc.page.height - 30,
          { align: "center", width: W },
        );
    }

    doc.end();
  } catch (error) {
    console.error("Error en exportarReportePDF:", error);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, mensaje: "Error generando el PDF." });
    }
  } finally {
    conn.release();
  }
}

// ─── Exportar reporte Excel ───────────────────────────────────────────────────
async function exportarReporteExcel(req, res) {
  const { id_paciente } = req.params;
  const conn = await asegurarAccesoPaciente(req, res, id_paciente);
  if (!conn) return;

  try {
    const { paciente, metricas, prescripciones, tomas } =
      await obtenerDatosReporte(conn, id_paciente);

    if (!paciente) {
      return res.status(404).json({ ok: false, mensaje: "Paciente no encontrado." });
    }

    const nombreArchivo = `reporte_${(paciente.nombre_completo || "paciente")
      .replace(/\s+/g, "_")
      .toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MedAlert";
    workbook.created = new Date();
    workbook.properties.date1904 = false;

    const ws = workbook.addWorksheet("Reporte del Paciente", {
      pageSetup: { paperSize: 9, orientation: "portrait" },
    });

    // ── Anchos de columna ──
    ws.columns = [
      { key: "A", width: 28 },
      { key: "B", width: 35 },
      { key: "C", width: 28 },
      { key: "D", width: 35 },
    ];

    const AZUL_OSCURO = "0F172A";
    const AZUL_PRIMARIO = "3B82F6";
    const AZUL_CLARO = "DBEAFE";
    const GRIS_BG = "F8FAFC";
    const VERDE = "16A34A";
    const ROJO = "DC2626";
    const AMARILLO = "F59E0B";

    function cellStyle(row, col, value, bold = false, bg = null, color = "000000", fontSize = 10, align = "left") {
      const cell = ws.getCell(row, col);
      cell.value = value;
      cell.font = { bold, size: fontSize, color: { argb: "FF" + color } };
      cell.alignment = { vertical: "middle", horizontal: align, wrapText: true };
      if (bg) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bg } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      return cell;
    }

    let r = 1;

    // ── Título ──
    ws.mergeCells(r, 1, r, 4);
    const titleCell = ws.getCell(r, 1);
    titleCell.value = "MedAlert · Reporte de Evolución Clínica";
    titleCell.font = { bold: true, size: 16, color: { argb: "FF" + "FFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + AZUL_OSCURO } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    ws.getRow(r).height = 36;
    r++;

    ws.mergeCells(r, 1, r, 4);
    const subCell = ws.getCell(r, 1);
    subCell.value = `Generado el ${fmtFecha(new Date())}`;
    subCell.font = { size: 9, color: { argb: "FF94A3B8" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + AZUL_OSCURO } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    ws.getRow(r).height = 18;
    r++;
    r++;

    // ── Datos del paciente ──
    ws.mergeCells(r, 1, r, 4);
    const secPac = ws.getCell(r, 1);
    secPac.value = "DATOS DEL PACIENTE";
    secPac.font = { bold: true, size: 11, color: { argb: "FF" + "FFFFFF" } };
    secPac.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + AZUL_PRIMARIO } };
    secPac.alignment = { vertical: "middle", horizontal: "left" };
    ws.getRow(r).height = 20;
    r++;

    const camposPaciente = [
      ["Nombre completo", paciente.nombre_completo, "Médico asignado", paciente.medico_nombre],
      ["Edad", paciente.edad ? `${paciente.edad} años` : "N/D", "Correo", paciente.correo],
      ["Peso", paciente.peso_kg ? `${paciente.peso_kg} kg` : "N/D", "Teléfono", paciente.telefono || "N/D"],
      ["Estatura", paciente.estatura_cm ? `${paciente.estatura_cm} cm` : "N/D", "Alergias", paciente.alergias || "Ninguna"],
      ["Historial clínico", paciente.historial_clinico || "Sin historial", "", ""],
    ];

    camposPaciente.forEach((fila, idx) => {
      const bg = idx % 2 === 0 ? "FFFFFF" : GRIS_BG;
      cellStyle(r, 1, fila[0], true, bg, "475569", 9);
      cellStyle(r, 2, fila[1], false, bg, AZUL_OSCURO, 9);
      cellStyle(r, 3, fila[2], true, bg, "475569", 9);
      cellStyle(r, 4, fila[3], false, bg, AZUL_OSCURO, 9);
      ws.getRow(r).height = 18;
      r++;
    });
    r++;

    // ── Métricas de adherencia ──
    ws.mergeCells(r, 1, r, 4);
    const secMet = ws.getCell(r, 1);
    secMet.value = "MÉTRICAS DE ADHERENCIA";
    secMet.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    secMet.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + AZUL_PRIMARIO } };
    secMet.alignment = { vertical: "middle", horizontal: "left" };
    ws.getRow(r).height = 20;
    r++;

    const adherencia = Number(metricas.porcentaje_adherencia || 0);
    const colorAdh = adherencia >= 80 ? VERDE : adherencia >= 60 ? AMARILLO : ROJO;

    const metricasFila1 = [
      ["Porcentaje de adherencia", `${adherencia}%`, colorAdh],
      ["Total tomas programadas", String(metricas.total || 0), AZUL_PRIMARIO],
    ];
    const metricasFila2 = [
      ["Tomas cumplidas", String(metricas.cumplidos || 0), VERDE],
      ["Tomas omitidas", String(metricas.omitidos || 0), ROJO],
    ];
    const metricasFila3 = [
      ["Tomas pendientes", String(metricas.pendientes || 0), AMARILLO],
    ];

    [metricasFila1, metricasFila2, metricasFila3].forEach((fila) => {
      fila.forEach((item, i) => {
        const colBase = 1 + i * 2;
        cellStyle(r, colBase, item[0], true, GRIS_BG, "475569", 9);
        cellStyle(r, colBase + 1, item[1], true, "FFFFFF", item[2], 14, "center");
      });
      ws.getRow(r).height = 28;
      r++;
    });
    r++;

    // ── Recetas activas ──
    ws.mergeCells(r, 1, r, 4);
    const secRec = ws.getCell(r, 1);
    secRec.value = "RECETAS ACTIVAS";
    secRec.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    secRec.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + AZUL_PRIMARIO } };
    secRec.alignment = { vertical: "middle", horizontal: "left" };
    ws.getRow(r).height = 20;
    r++;

    // Cabecera tabla recetas - usamos 6 columnas, expandimos el sheet
    ws.columns = [
      { key: "A", width: 22 },
      { key: "B", width: 20 },
      { key: "C", width: 20 },
      { key: "D", width: 10 },
      { key: "E", width: 10 },
      { key: "F", width: 30 },
    ];

    const headersRec = ["Medicamento", "Dosis", "Frecuencia", "Días", "Stock", "Indicaciones"];
    headersRec.forEach((h, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 9, color: { argb: "FF" + AZUL_OSCURO } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + AZUL_CLARO } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "medium", color: { argb: "FF" + AZUL_PRIMARIO } },
        bottom: { style: "medium", color: { argb: "FF" + AZUL_PRIMARIO } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
    ws.getRow(r).height = 18;
    r++;

    if (prescripciones.length === 0) {
      ws.mergeCells(r, 1, r, 6);
      cellStyle(r, 1, "Sin recetas activas registradas.", false, GRIS_BG, "475569", 9, "center");
      ws.getRow(r).height = 18;
      r++;
    } else {
      prescripciones.forEach((presc, idx) => {
        const bg = idx % 2 === 0 ? "FFFFFF" : GRIS_BG;
        const vals = [
          presc.nombre_comercial,
          presc.dosis_instruccion,
          String(presc.patron_horario || "").replaceAll("_", " "),
          presc.duracion_dias || 7,
          presc.stock_estimado || 0,
          presc.indicaciones || "Según receta",
        ];
        vals.forEach((v, i) => {
          cellStyle(r, i + 1, v, false, bg, AZUL_OSCURO, 9, i >= 3 ? "center" : "left");
        });
        ws.getRow(r).height = 18;
        r++;
      });
    }
    r++;

    // ── Historial de tomas ──
    ws.mergeCells(r, 1, r, 6);
    const secHist = ws.getCell(r, 1);
    secHist.value = "HISTORIAL RECIENTE DE TOMAS (últimas 30)";
    secHist.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    secHist.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + AZUL_PRIMARIO } };
    secHist.alignment = { vertical: "middle", horizontal: "left" };
    ws.getRow(r).height = 20;
    r++;

    const headersHist = ["Medicamento", "Fecha programada", "Fecha real", "Resultado", "Motivo", "Observaciones"];
    headersHist.forEach((h, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 9, color: { argb: "FF" + AZUL_OSCURO } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + AZUL_CLARO } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "medium", color: { argb: "FF" + AZUL_PRIMARIO } },
        bottom: { style: "medium", color: { argb: "FF" + AZUL_PRIMARIO } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
    ws.getRow(r).height = 18;
    r++;

    if (tomas.length === 0) {
      ws.mergeCells(r, 1, r, 6);
      cellStyle(r, 1, "Sin historial de tomas registradas.", false, GRIS_BG, "475569", 9, "center");
      ws.getRow(r).height = 18;
    } else {
      tomas.forEach((toma, idx) => {
        const bg = idx % 2 === 0 ? "FFFFFF" : GRIS_BG;
        const colorRes = toma.estatus === "cumplido" ? VERDE : toma.estatus === "no_cumplido" ? ROJO : AMARILLO;
        const vals = [
          toma.nombre_comercial,
          fmtFecha(toma.fecha_hora_programada),
          fmtFecha(toma.fecha_hora_real),
          String(toma.estatus || "").replaceAll("_", " "),
          String(toma.motivo_omision || "-").replaceAll("_", " "),
          toma.observaciones || "-",
        ];
        vals.forEach((v, i) => {
          const col = i === 3 ? colorRes : AZUL_OSCURO;
          const bold = i === 3;
          cellStyle(r, i + 1, v, bold, bg, col, 9);
        });
        ws.getRow(r).height = 18;
        r++;
      });
    }

    // ── Escribir y responder ──
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreArchivo}"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error en exportarReporteExcel:", error);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, mensaje: "Error generando el Excel." });
    }
  } finally {
    conn.release();
  }
}

async function obtenerAdherenciaMensual(req, res) {
  const { id_paciente } = req.params;
  const { mes, agrupar } = req.query;

  const conn = await asegurarAccesoPaciente(req, res, id_paciente);
  if (!conn) return;

  try {
    conn.release();

    const datosAdherencia = await adherenciaService.obtenerTendenciaMensual(
      Number(id_paciente),
      mes,
      agrupar
    );

    return res.status(200).json({
      ok: true,
      ...datosAdherencia
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: error.message || "Error interno del servidor al obtener adherencia."
    });
  }
}

module.exports = {
  activarPrescripcion,
  actualizarPrescripcion,
  actualizarMedicamentoCatalogo,
  confirmarLecturaNotificacion,
  crearMedicamentoCatalogo,
  desactivarPrescripcion,
  dispensarPrescripcion,
  eliminarMedicamentoCatalogo,
  exportarReportePDF,
  exportarReporteExcel,
  guardarNotaMedica,
  marcarToma,
  marcarTomasLoteHospitalario,
  obtenerAlertasStock,
  obtenerCatalogo,
  obtenerHistorialPrescripcion,
  obtenerNotificacionesPaciente,
  obtenerNotasPaciente,
  obtenerPacientes,
  obtenerPrescripcionesPaciente,
  obtenerResumenPaciente,
  obtenerTomasPaciente,
  procesarNotificacionesManual,
  prescribirMedicamento,
  obtenerAdherenciaMensual,
};
