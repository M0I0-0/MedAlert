// src/routes/medicamentos.js
const express = require("express");
const router = express.Router();
const { autenticar, autorizar } = require("../middlewares/auth");
const medicamentoController = require("../controllers/medicamentoController");

// Ruta para obtener el inventario (Médicos y Farmacéuticos)
router.get(
  "/catalogo",
  autenticar,
  autorizar("medico", "farmaceutico"),
  medicamentoController.obtenerCatalogo,
);

router.post(
  "/catalogo",
  autenticar,
  autorizar("farmaceutico"),
  medicamentoController.crearMedicamentoCatalogo,
);

router.put(
  "/catalogo/:id_medicamento",
  autenticar,
  autorizar("farmaceutico"),
  medicamentoController.actualizarMedicamentoCatalogo,
);

router.delete(
  "/catalogo/:id_medicamento",
  autenticar,
  autorizar("farmaceutico"),
  medicamentoController.eliminarMedicamentoCatalogo,
);

router.get(
  "/pacientes",
  autenticar,
  autorizar("medico", "familiar"),
  medicamentoController.obtenerPacientes,
);

// Ruta para recetar (Exclusivo de médicos)
router.post(
  "/prescribir",
  autenticar,
  autorizar("medico"),
  medicamentoController.prescribirMedicamento,
);

router.put(
  "/prescripcion/:id_prescripcion",
  autenticar,
  autorizar("medico"),
  medicamentoController.actualizarPrescripcion,
);

router.delete(
  "/prescripcion/:id_prescripcion",
  autenticar,
  autorizar("medico"),
  medicamentoController.desactivarPrescripcion,
);

router.post(
  "/prescripcion/:id_prescripcion/activar",
  autenticar,
  autorizar("medico"),
  medicamentoController.activarPrescripcion,
);

router.post(
  "/prescripcion/:id_prescripcion/dispensar",
  autenticar,
  autorizar("farmaceutico"),
  medicamentoController.dispensarPrescripcion,
);

// Ruta para ver historial (Médicos, Farmacéuticos, Paciente o Familiar)
router.get(
  "/paciente/:id_paciente",
  autenticar,
  autorizar("medico", "farmaceutico", "paciente", "familiar"),
  medicamentoController.obtenerPrescripcionesPaciente,
);

router.get(
  "/paciente/:id_paciente/resumen",
  autenticar,
  autorizar("medico", "farmaceutico", "paciente", "familiar"),
  medicamentoController.obtenerResumenPaciente,
);

router.get(
  "/paciente/:id_paciente/adherencia-mensual",
  autenticar,
  autorizar("medico", "paciente", "familiar"),
  medicamentoController.obtenerAdherenciaMensual,
);

router.get(
  "/paciente/:id_paciente/tomas",
  autenticar,
  autorizar("medico", "farmaceutico", "paciente", "familiar"),
  medicamentoController.obtenerTomasPaciente,
);

router.get(
  "/paciente/:id_paciente/notificaciones",
  autenticar,
  autorizar("medico", "farmaceutico", "paciente", "familiar"),
  medicamentoController.obtenerNotificacionesPaciente,
);

router.get(
  "/paciente/:id_paciente/notas",
  autenticar,
  autorizar("medico", "paciente", "familiar"),
  medicamentoController.obtenerNotasPaciente,
);

router.get(
  "/prescripcion/:id_prescripcion/historial",
  autenticar,
  autorizar("medico", "farmaceutico", "paciente", "familiar"),
  medicamentoController.obtenerHistorialPrescripcion,
);

router.get(
  "/stock/alertas",
  autenticar,
  autorizar("medico", "farmaceutico", "paciente", "familiar"),
  medicamentoController.obtenerAlertasStock,
);

router.post(
  "/notas",
  autenticar,
  autorizar("medico"),
  medicamentoController.guardarNotaMedica,
);

router.post(
  "/notificaciones/procesar",
  autenticar,
  autorizar("medico", "administrador"),
  medicamentoController.procesarNotificacionesManual,
);

router.post(
  "/notificaciones/:id_notificacion/leer",
  autenticar,
  autorizar("medico", "paciente", "familiar"),
  medicamentoController.confirmarLecturaNotificacion,
);

router.post(
  "/tomas/:id_toma/marcar",
  autenticar,
  autorizar("medico", "paciente", "familiar"),
  medicamentoController.marcarToma,
);

router.post(
  "/tomas/lote-hospitalario",
  autenticar,
  autorizar("medico"),
  medicamentoController.marcarTomasLoteHospitalario,
);

// ─── Exportación de reportes ──────────────────────────────────────────────────
router.get(
  "/paciente/:id_paciente/reporte/pdf",
  autenticar,
  autorizar("medico", "familiar", "paciente"),
  medicamentoController.exportarReportePDF,
);

router.get(
  "/paciente/:id_paciente/reporte/excel",
  autenticar,
  autorizar("medico", "familiar", "paciente"),
  medicamentoController.exportarReporteExcel,
);

module.exports = router;
