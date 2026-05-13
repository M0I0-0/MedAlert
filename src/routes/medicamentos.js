// src/routes/medicamentos.js
const express = require("express");
const router = express.Router();
const { autenticar, autorizar } = require("../middlewares/auth");
const medicamentoController = require("../controllers/medicamentoController");

// Ruta para recetar (Exclusivo de médicos)
router.post(
  "/prescribir",
  autenticar,
  autorizar("medico"),
  medicamentoController.prescribirMedicamento,
);

// Ruta para ver historial (Pueden verlo médicos, el propio paciente, o su familiar/cuidador)
router.get(
  "/paciente/:id_paciente",
  autenticar,
  autorizar("medico", "paciente", "familiar"),
  medicamentoController.obtenerMedicamentosPaciente,
);

module.exports = router;
