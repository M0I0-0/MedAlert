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
  "/paciente/:id_paciente/tomas",
  autenticar,
  autorizar("medico", "farmaceutico", "paciente", "familiar"),
  medicamentoController.obtenerTomasPaciente,
);

router.get(
  "/paciente/:id_paciente/notas",
  autenticar,
  autorizar("medico", "paciente", "familiar"),
  medicamentoController.obtenerNotasPaciente,
);

router.post(
  "/notas",
  autenticar,
  autorizar("medico"),
  medicamentoController.guardarNotaMedica,
);

router.post(
  "/tomas/:id_toma/marcar",
  autenticar,
  autorizar("medico", "paciente", "familiar"),
  medicamentoController.marcarToma,
);

module.exports = router;
