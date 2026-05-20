// src/services/adherenciaService.js
const { pool } = require("../database/connection");

/**
 * Obtiene la tendencia de adherencia mensual de un paciente agrupada por día o semana.
 * 
 * @param {number} idPaciente - ID del paciente.
 * @param {string} mes - Mes en formato 'YYYY-MM' (ej. '2026-05').
 * @param {string} agrupar - Tipo de agrupación: 'dia' o 'semana'.
 * @returns {Promise<Object>} Resumen y listado agrupado de adherencia.
 */
async function obtenerTendenciaMensual(idPaciente, mes, agrupar = "dia") {
  // 1. Validar formato del mes (YYYY-MM)
  const regexMes = /^\d{4}-\d{2}$/;
  let mesConsultado = mes;
  if (!mes || !regexMes.test(mes)) {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mesActual = String(ahora.getMonth() + 1).padStart(2, "0");
    mesConsultado = `${anio}-${mesActual}`;
  }

  const [anioStr, mesStr] = mesConsultado.split("-");
  const anio = parseInt(anioStr, 10);
  const mesIdx = parseInt(mesStr, 10) - 1; // 0-indexed en JS

  // 2. Determinar límites de fechas del mes en la base de datos
  const primerDiaObj = new Date(anio, mesIdx, 1, 0, 0, 0);
  const ultimoDiaObj = new Date(anio, mesIdx + 1, 0, 23, 59, 59); // Día 0 del siguiente mes es el último día de este mes
  const totalDias = ultimoDiaObj.getDate();

  const fechaInicio = primerDiaObj.toISOString().slice(0, 19).replace("T", " ");
  const fechaFin = ultimoDiaObj.toISOString().slice(0, 19).replace("T", " ");

  // 3. Inicializar la estructura de datos agrupados
  let datosAgrupados = [];
  if (agrupar === "semana") {
    // Definimos 5 semanas fijas basadas en rangos de días para mantener la gráfica uniforme
    datosAgrupados = [
      { periodo: 1, label: "Semana 1 (1-7)", rango: [1, 7], tomas_programadas: 0, tomas_cumplidas: 0, tomas_omitidas: 0, adherencia: null, sin_registros: true },
      { periodo: 2, label: "Semana 2 (8-14)", rango: [8, 14], tomas_programadas: 0, tomas_cumplidas: 0, tomas_omitidas: 0, adherencia: null, sin_registros: true },
      { periodo: 3, label: "Semana 3 (15-21)", rango: [15, 21], tomas_programadas: 0, tomas_cumplidas: 0, tomas_omitidas: 0, adherencia: null, sin_registros: true },
      { periodo: 4, label: "Semana 4 (22-28)", rango: [22, 28], tomas_programadas: 0, tomas_cumplidas: 0, tomas_omitidas: 0, adherencia: null, sin_registros: true },
      { periodo: 5, label: `Semana 5 (29-${totalDias})`, rango: [29, totalDias], tomas_programadas: 0, tomas_cumplidas: 0, tomas_omitidas: 0, adherencia: null, sin_registros: true }
    ];
  } else {
    // Agrupación por día (1 a totalDias)
    for (let d = 1; d <= totalDias; d++) {
      datosAgrupados.push({
        periodo: d,
        label: `Día ${d}`,
        tomas_programadas: 0,
        tomas_cumplidas: 0,
        tomas_omitidas: 0,
        adherencia: null,
        sin_registros: true
      });
    }
  }

  // 4. Ejecutar consulta SQL parametrizada y segura
  const query = `
    SELECT 
      t.id_toma,
      t.fecha_hora_programada,
      t.estatus
    FROM toma_recordatorio t
    JOIN prescripcion p ON t.id_prescripcion = p.id_prescripcion
    WHERE p.id_paciente = ?
      AND t.fecha_hora_programada >= ?
      AND t.fecha_hora_programada <= ?
    ORDER BY t.fecha_hora_programada ASC
  `;

  const [rows] = await pool.query(query, [idPaciente, fechaInicio, fechaFin]);

  // 5. Agrupar registros obtenidos de la BD
  rows.forEach((toma) => {
    // Extraer el día del mes del registro
    const dateObj = toma.fecha_hora_programada instanceof Date 
      ? toma.fecha_hora_programada 
      : new Date(toma.fecha_hora_programada);
    
    const diaDelMes = dateObj.getDate();
    const estatus = toma.estatus;

    // Solo contabilizar tomas que han sido marcadas como cumplidas o no_cumplidas
    // Excluimos pendientes del cálculo para no alterar negativamente el índice de adherencia futura
    if (estatus === "cumplido" || estatus === "no_cumplido") {
      if (agrupar === "semana") {
        // Encontrar en qué semana cae el día
        let semanaIdx = 0;
        if (diaDelMes >= 1 && diaDelMes <= 7) semanaIdx = 0;
        else if (diaDelMes >= 8 && diaDelMes <= 14) semanaIdx = 1;
        else if (diaDelMes >= 15 && diaDelMes <= 21) semanaIdx = 2;
        else if (diaDelMes >= 22 && diaDelMes <= 28) semanaIdx = 3;
        else semanaIdx = 4;

        datosAgrupados[semanaIdx].tomas_programadas += 1;
        if (estatus === "cumplido") {
          datosAgrupados[semanaIdx].tomas_cumplidas += 1;
        } else {
          datosAgrupados[semanaIdx].tomas_omitidas += 1;
        }
      } else {
        // Por día (diaDelMes - 1 en el array)
        const diaIdx = diaDelMes - 1;
        if (diaIdx >= 0 && diaIdx < datosAgrupados.length) {
          datosAgrupados[diaIdx].tomas_programadas += 1;
          if (estatus === "cumplido") {
            datosAgrupados[diaIdx].tomas_cumplidas += 1;
          } else {
            datosAgrupados[diaIdx].tomas_omitidas += 1;
          }
        }
      }
    }
  });

  // 6. Calcular porcentajes por cada periodo y totales mensuales
  let totalProgramadas = 0;
  let totalCumplidas = 0;
  let totalOmitidas = 0;

  datosAgrupados.forEach((periodo) => {
    if (periodo.tomas_programadas > 0) {
      periodo.adherencia = Math.round((periodo.tomas_cumplidas / periodo.tomas_programadas) * 100 * 10) / 10;
      periodo.sin_registros = false;
      
      totalProgramadas += periodo.tomas_programadas;
      totalCumplidas += periodo.tomas_cumplidas;
      totalOmitidas += periodo.tomas_omitidas;
    } else {
      // Manejo explícito de periodos sin registros (0% o texto)
      periodo.adherencia = 0;
      periodo.sin_registros = true;
    }
  });

  const adherenciaMensual = totalProgramadas > 0 
    ? Math.round((totalCumplidas / totalProgramadas) * 100 * 10) / 10 
    : 0;

  // 7. Evaluación cualitativa de la adherencia
  let estadoAdherencia = "Sin registros";
  if (totalProgramadas > 0) {
    if (adherenciaMensual >= 90) {
      estadoAdherencia = "Excelente adherencia (>=90%)";
    } else if (adherenciaMensual >= 70) {
      estadoAdherencia = "Adherencia regular (70-89%)";
    } else {
      estadoAdherencia = "Baja adherencia (<70%)";
    }
  }

  // 8. Retornar resumen estructurado y datos agrupados
  return {
    mes: mesConsultado,
    agrupacion: agrupar,
    resumen: {
      total_tomas_programadas: totalProgramadas,
      total_tomas_cumplidas: totalCumplidas,
      total_tomas_omitidas: totalOmitidas,
      adherencia_mensual: adherenciaMensual,
      estado_adherencia: estadoAdherencia,
      sin_registros: totalProgramadas === 0
    },
    datos: datosAgrupados
  };
}

module.exports = {
  obtenerTendenciaMensual
};
