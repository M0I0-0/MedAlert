// src/services/firmaService.js
const crypto = require("crypto");
const { pool } = require("../database/connection");

// Clave secreta interna para firmar los hashes y evitar manipulación externa
const SECRETO_FIRMA = process.env.JWT_SECRET || "MedAlertFirmaDigitalSecuritaria2026";

/**
 * Genera una firma criptográfica SHA-256 basada en los datos del reporte
 * y la registra en la base de datos como evidencia oficial.
 * 
 * @param {number} idPaciente - ID del paciente.
 * @param {string} tipoReporte - Tipo de reporte ('pdf' | 'excel').
 * @param {Object} datos - Objeto de datos con { paciente, metricas, prescripciones, tomas }.
 * @returns {Promise<Object>} Hash generado y timestamp automático.
 */
async function generarFirmaYRegistrar(idPaciente, tipoReporte, datos) {
  const timestamp = new Date();
  
  // Simplificar y estructurar datos de origen para persistir evidencia de auditoría
  const datosSimplificados = {
    paciente: {
      id_paciente: Number(idPaciente),
      nombre_completo: datos.paciente.nombre_completo || "Sin nombre",
      medico_nombre: datos.paciente.medico_nombre || "Sin médico asignado",
      correo: datos.paciente.correo || "",
      edad: datos.paciente.edad || 0
    },
    metricas: {
      total_tomas_programadas: datos.tomas.length,
      total_tomas_cumplidas: datos.tomas.filter(t => t.estatus === 'cumplido').length,
      total_tomas_omitidas: datos.tomas.filter(t => t.estatus === 'no_cumplido').length,
      porcentaje_adherencia: Number(datos.metricas.porcentaje_adherencia) || 0
    },
    prescripciones: (datos.prescripciones || []).map(p => ({
      nombre_comercial: p.nombre_comercial,
      dosis_instruccion: p.dosis_instruccion,
      patron_horario: p.patron_horario
    })),
    tomas_resumen: (datos.tomas || []).map(t => ({
      nombre_comercial: t.nombre_comercial,
      fecha_hora_programada: t.fecha_hora_programada,
      fecha_hora_real: t.fecha_hora_real,
      estatus: t.estatus
    }))
  };

  // Crear un payload determinista para el hashing
  const payloadStr = JSON.stringify({
    id_paciente: datosSimplificados.paciente.id_paciente,
    nombre_completo: datosSimplificados.paciente.nombre_completo,
    total_programadas: datosSimplificados.metricas.total_tomas_programadas,
    total_cumplidas: datosSimplificados.metricas.total_tomas_cumplidas,
    porcentaje_adherencia: datosSimplificados.metricas.porcentaje_adherencia,
    timestamp: timestamp.toISOString()
  });

  // Generar HMAC SHA-256 seguro
  const hmac = crypto.createHmac("sha256", SECRETO_FIRMA);
  hmac.update(payloadStr);
  const hashSha256 = hmac.digest("hex");

  // Registrar en la base de datos como evidencia inmutable
  const query = `
    INSERT INTO reporte_firma (id_paciente, tipo_reporte, hash_sha256, timestamp, datos_origen)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  await pool.query(query, [
    idPaciente,
    tipoReporte,
    hashSha256,
    timestamp,
    JSON.stringify(datosSimplificados)
  ]);

  return {
    hash: hashSha256,
    timestamp: timestamp
  };
}

/**
 * Consulta la autenticidad e integridad de un reporte médico a través de su hash SHA-256.
 * 
 * @param {string} hashSha256 - Código SHA-256 a validar.
 * @returns {Promise<Object>} Resultado de verificación y datos del documento original.
 */
async function verificarFirmaReporte(hashSha256) {
  if (!hashSha256 || typeof hashSha256 !== "string" || hashSha256.trim().length !== 64) {
    return {
      verificado: false,
      mensaje: "Formato de firma digital inválido. Debe ser una cadena hexadecimal SHA-256 de 64 caracteres."
    };
  }

  const query = `
    SELECT id_firma, id_paciente, tipo_reporte, hash_sha256, timestamp, datos_origen
    FROM reporte_firma
    WHERE hash_sha256 = ?
  `;

  const [rows] = await pool.query(query, [hashSha256.trim().toLowerCase()]);

  if (rows.length === 0) {
    return {
      verificado: false,
      mensaje: "Firma digital no registrada o documento alterado de forma no autorizada."
    };
  }

  const record = rows[0];
  const datosOrigen = typeof record.datos_origen === "string" 
    ? JSON.parse(record.datos_origen) 
    : record.datos_origen;

  return {
    verificado: true,
    mensaje: "Documento verificado. La firma digital coincide exactamente con el registro inmutable del servidor.",
    datos_firma: {
      id_firma: record.id_firma,
      id_paciente: record.id_paciente,
      tipo_reporte: record.tipo_reporte.toUpperCase(),
      hash_sha256: record.hash_sha256,
      timestamp: record.timestamp,
      datos_origen: datosOrigen
    }
  };
}

module.exports = {
  generarFirmaYRegistrar,
  verificarFirmaReporte
};
