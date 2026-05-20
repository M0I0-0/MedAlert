const { pool } = require("../database/connection");

const ETAPAS = [
  { etapa: "15_min_antes", minutos: -15 },
  { etapa: "5_min_antes", minutos: -5 },
  { etapa: "10_min_despues", minutos: 10 },
];

function sumarMinutos(fecha, minutos) {
  return new Date(fecha.getTime() + minutos * 60000);
}

function formatearDateTime(fecha) {
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

function construirMensaje({ paciente, medicamento, fechaHora, etapa }) {
  const hora = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(fechaHora));

  const prefijo = {
    "15_min_antes": "Recordatorio",
    "5_min_antes": "Recordatorio cercano",
    "10_min_despues": "Seguimiento",
  }[etapa];

  return `${prefijo}: ${paciente}, toma ${medicamento} programada para ${hora}.`;
}

async function asegurarNotificacionesPendientes() {
  const [tomas] = await pool.query(`
    SELECT
      t.id_toma,
      t.fecha_hora_programada,
      p.nombre_completo AS paciente,
      p.telefono,
      mc.nombre_comercial AS medicamento
    FROM toma_recordatorio t
    JOIN prescripcion pr ON pr.id_prescripcion = t.id_prescripcion
    JOIN paciente p ON p.id_paciente = pr.id_paciente
    JOIN medicamento_catalogo mc ON mc.id_medicamento = pr.id_medicamento
    WHERE t.estatus = 'pendiente'
      AND t.fecha_hora_programada BETWEEN DATE_SUB(NOW(), INTERVAL 1 DAY)
                                      AND DATE_ADD(NOW(), INTERVAL 7 DAY)
  `);

  for (const toma of tomas) {
    const fechaProgramada = new Date(toma.fecha_hora_programada);
    for (const item of ETAPAS) {
      const programadaPara = sumarMinutos(fechaProgramada, item.minutos);
      const mensaje = construirMensaje({
        paciente: toma.paciente,
        medicamento: toma.medicamento,
        fechaHora: toma.fecha_hora_programada,
        etapa: item.etapa,
      });

      await pool.query(
        `
          INSERT IGNORE INTO notificacion_recordatorio
          (id_toma, tipo, etapa, canal_destino, mensaje, programada_para)
          VALUES (?, 'sms', ?, ?, ?, ?)
        `,
        [
          toma.id_toma,
          item.etapa,
          toma.telefono || null,
          mensaje,
          formatearDateTime(programadaPara),
        ],
      );
    }
  }
}

async function enviarNotificacionesVencidas() {
  const [notificaciones] = await pool.query(`
    SELECT n.*, t.estatus AS toma_estatus
    FROM notificacion_recordatorio n
    JOIN toma_recordatorio t ON t.id_toma = n.id_toma
    WHERE n.estado = 'pendiente'
      AND n.programada_para <= NOW()
    ORDER BY n.programada_para ASC
    LIMIT 50
  `);

  for (const notificacion of notificaciones) {
    if (notificacion.etapa === "10_min_despues" && notificacion.toma_estatus !== "pendiente") {
      // Si la toma ya fue confirmada (cumplida o no_cumplida), cancelamos el envío
      await pool.query(
        `
          UPDATE notificacion_recordatorio
          SET estado = 'fallida'
          WHERE id_notificacion = ?
        `,
        [notificacion.id_notificacion],
      );
      continue;
    }

    await pool.query(
      `
        INSERT INTO sms_log (id_notificacion, telefono, mensaje)
        VALUES (?, ?, ?)
      `,
      [
        notificacion.id_notificacion,
        notificacion.canal_destino || null,
        notificacion.mensaje,
      ],
    );

    await pool.query(
      `
        UPDATE notificacion_recordatorio
        SET estado = 'enviada', enviada_en = NOW()
        WHERE id_notificacion = ?
      `,
      [notificacion.id_notificacion],
    );
  }

  return notificaciones.length;
}

async function procesarNotificaciones() {
  await asegurarNotificacionesPendientes();
  return enviarNotificacionesVencidas();
}

function iniciarSchedulerNotificaciones() {
  const intervaloMs = Number(process.env.NOTIFICATION_INTERVAL_MS || 60000);

  procesarNotificaciones().catch((error) => {
    console.error("Error en scheduler de notificaciones:", error.message);
  });

  return setInterval(() => {
    procesarNotificaciones().catch((error) => {
      console.error("Error en scheduler de notificaciones:", error.message);
    });
  }, intervaloMs);
}

module.exports = {
  iniciarSchedulerNotificaciones,
  procesarNotificaciones,
};
