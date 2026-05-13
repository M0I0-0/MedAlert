// src/controllers/medicamentoController.js
const { pool } = require("../database/connection");

const prescribirMedicamento = async (req, res) => {
  const id_medico = req.usuario.id; // Viene del token validado
  const {
    id_paciente,
    nombre,
    principio_activo,
    dosis,
    presentacion,
    frecuencia_horas,
    stock_estimado,
  } = req.body;

  if (
    !id_paciente ||
    !nombre ||
    !principio_activo ||
    !dosis ||
    !frecuencia_horas
  ) {
    return res.status(400).json({
      ok: false,
      mensaje: "Faltan datos obligatorios de la prescripción.",
    });
  }

  try {
    // 1. Validar que el paciente pertenezca a este médico
    const [paciente] = await pool.query(
      `SELECT id_paciente FROM paciente WHERE id_paciente = ? AND id_medico = ? LIMIT 1`,
      [id_paciente, id_medico],
    );

    if (paciente.length === 0) {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permiso para recetar a este paciente.",
      });
    }

    // 2. Obtener los principios activos que el paciente YA está tomando
    const [medsActivos] = await pool.query(
      `SELECT principio_activo FROM medicamento WHERE id_paciente = ?`, // Asumiendo que están activos
      [id_paciente],
    );

    const principiosActuales = medsActivos.map((m) => m.principio_activo);

    // 3. MOTOR DE INTERACCIONES: Verificar si el nuevo fármaco choca con los actuales
    if (principiosActuales.length > 0) {
      const [interacciones] = await pool.query(
        `SELECT nivel_riesgo, descripcion 
         FROM interacciones_medicas 
         WHERE (principio_a = ? AND principio_b IN (?)) 
            OR (principio_b = ? AND principio_a IN (?))`,
        [
          principio_activo,
          principiosActuales,
          principio_activo,
          principiosActuales,
        ],
      );

      // Si encuentra una interacción de riesgo alto o crítico, bloqueamos la receta
      const alertasCriticas = interacciones.filter(
        (i) => i.nivel_riesgo === "alto" || i.nivel_riesgo === "critico",
      );

      if (alertasCriticas.length > 0) {
        return res.status(409).json({
          ok: false,
          mensaje: "¡ALERTA MÉDICA! Se detectó una interacción peligrosa.",
          detalles: alertasCriticas,
        });
      }
    }

    // 4. Si es seguro, guardamos el medicamento
    const [result] = await pool.query(
      `INSERT INTO medicamento (id_paciente, id_medico, nombre, principio_activo, dosis, presentacion, frecuencia_horas, stock_estimado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_paciente,
        id_medico,
        nombre,
        principio_activo,
        dosis,
        presentacion || null,
        frecuencia_horas,
        stock_estimado || 0,
      ],
    );

    // NOTA: Aquí iría la lógica para generar automáticamente la tabla "recordatorio" (las alarmas)

    return res.status(201).json({
      ok: true,
      mensaje: "Medicamento prescrito de forma segura.",
      medicamento: { id: result.insertId, nombre, principio_activo },
    });
  } catch (error) {
    console.error("Error prescribiendo medicamento:", error.message);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
};

const obtenerMedicamentosPaciente = async (req, res) => {
  const { id_paciente } = req.params;

  try {
    const [medicamentos] = await pool.query(
      `SELECT id_medicamento, nombre, principio_activo, dosis, frecuencia_horas, stock_estimado 
       FROM medicamento WHERE id_paciente = ?`,
      [id_paciente],
    );

    return res.status(200).json({ ok: true, medicamentos });
  } catch (error) {
    console.error("Error obteniendo medicamentos:", error.message);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno del servidor." });
  }
};

module.exports = { prescribirMedicamento, obtenerMedicamentosPaciente };
