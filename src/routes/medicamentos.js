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

// Ruta para recetar (Exclusivo de médicos)
router.post(
  "/prescribir",
  autenticar,
  autorizar("medico"),
  medicamentoController.prescribirMedicamento,
);

// Ruta para ver historial (Médicos, Farmacéuticos, Paciente o Familiar)
router.get(
  "/paciente/:id_paciente",
  autenticar,
  autorizar("medico", "farmaceutico", "paciente", "familiar"),
  medicamentoController.obtenerPrescripcionesPaciente,
);

module.exports = router;
