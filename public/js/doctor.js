document.addEventListener("DOMContentLoaded", () => {
  const usuario = MedAlertApi.getUsuario();
  if (!usuario || usuario.rol !== "medico") {
    MedAlertApi.clearSession();
    window.location.href = "/pages/index.html";
    return;
  }

  const state = {
    pacientes: [],
    medicamentos: [],
    pacienteActual: null,
  };

  const doctorName = document.getElementById("doctor-name");
  const doctorSpecialty = document.getElementById("doctor-specialty");
  const logoutButton = document.getElementById("logout-button");
  const patientSelect = document.getElementById("patient-select");
  const medicationSelect = document.getElementById("medication-select");
  const doseRule = document.getElementById("dose-rule");
  const doseInput = document.getElementById("dose-input");
  const scheduleSelect = document.getElementById("schedule-select");
  const schedulePreview = document.getElementById("schedule-preview");
  const durationInput = document.getElementById("duration-input");
  const stockInput = document.getElementById("stock-input");
  const instructionsInput = document.getElementById("instructions-input");
  const prescriptionForm = document.getElementById("prescription-form");
  const activePrescriptionsList = document.getElementById("active-prescriptions-list");
  const doctorMessage = document.getElementById("doctor-message");
  const patientList = document.getElementById("doctor-patient-list");
  const notesList = document.getElementById("doctor-notes-list");
  const noteForm = document.getElementById("note-form");
  const noteContent = document.getElementById("note-content");

  doctorName.textContent = usuario.nombre_completo || "Médico";
  doctorSpecialty.textContent = usuario.especialidad || "Seguimiento clínico";

  function showMessage(message, type = "info") {
    doctorMessage.style.display = "block";
    doctorMessage.innerHTML = `<h4>${type === "error" ? "Atención" : "MedAlert"}</h4><p>${message}</p>`;
    doctorMessage.style.borderColor =
      type === "error" ? "#fecaca" : type === "success" ? "#bbf7d0" : "#bfdbfe";
    doctorMessage.style.background =
      type === "error" ? "#fef2f2" : type === "success" ? "#f0fdf4" : "#eff6ff";
  }

  function formatDate(dateString) {
    if (!dateString) return "Sin dato";
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateString));
  }

  function initials(name) {
    return String(name || "NA")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0])
      .join("")
      .toUpperCase();
  }

  function scheduleChips(value) {
    const map = {
      cada_8_horas: ["08:00", "16:00", "00:00"],
      cada_12_horas: ["09:00", "21:00"],
      dias_alternos: ["09:00", "cada 2 días"],
      solo_fines_de_semana: ["Sábado 09:00", "Domingo 09:00"],
      diario_con_alimentos: ["08:00", "20:00"],
      diario_noche: ["21:00"],
    };
    return map[value] || ["Selecciona una frecuencia"];
  }

  function renderSchedulePreview() {
    schedulePreview.innerHTML = scheduleChips(scheduleSelect.value)
      .map((item) => `<span>${item}</span>`)
      .join("");
  }

  function updateHero(patient) {
    document.getElementById("selected-patient-name").textContent =
      patient?.nombre_completo || "Sin paciente seleccionado";
    document.getElementById("patient-dose-mode").textContent = patient
      ? `Peso: ${patient.peso_kg || "N/D"} kg • Alergia: ${patient.alergias || "Ninguna"}`
      : "Selecciona un paciente";
    document.getElementById("hero-allergy-text").textContent =
      patient?.alergias || "Sin alergias registradas";
  }

  function calculateDose() {
    const patient = state.pacienteActual;
    if (!patient) return;

    if (doseRule.value === "peso") {
      const dose = Number(patient.peso_kg || 0) * 10;
      doseInput.value = dose > 0 ? `${dose} mg/día` : "";
      document.getElementById("metric-dosis").textContent = "1";
    } else if (doseRule.value === "edad") {
      const dose = Math.max(250, Number(patient.edad || 0) * 10);
      doseInput.value = `${dose} mg/día`;
      document.getElementById("metric-dosis").textContent = "1";
    } else {
      document.getElementById("metric-dosis").textContent = "0";
    }
  }

  function renderPatientList() {
    if (!state.pacientes.length) {
      patientList.innerHTML = `
        <div class="task-item">
          <span class="task-marker marker-danger"></span>
          <div>
            <strong>No hay pacientes asignados</strong>
            <small>Registra al menos un paciente para usar el panel.</small>
          </div>
        </div>
      `;
      return;
    }

    patientList.innerHTML = state.pacientes
      .map(
        (paciente) => `
          <div class="task-item">
            <span class="task-marker ${
              Number(paciente.porcentaje_adherencia) < 70 ? "marker-danger" : "marker-primary"
            }"></span>
            <div>
              <strong>${paciente.nombre_completo}</strong>
              <small>Adherencia ${Number(paciente.porcentaje_adherencia || 0)}% • Omitidas ${paciente.omitidos || 0}</small>
            </div>
          </div>
        `,
      )
      .join("");
  }

  function fillPatientSelect() {
    patientSelect.innerHTML =
      '<option value="">Selecciona un paciente</option>' +
      state.pacientes
        .map(
          (paciente) => `
            <option value="${paciente.id_paciente}">
              ${paciente.nombre_completo}
            </option>
          `,
        )
        .join("");
  }

  function fillMedicationSelect() {
    medicationSelect.innerHTML =
      '<option value="">Selecciona un medicamento</option>' +
      state.medicamentos
        .map(
          (medicamento) => `
            <option value="${medicamento.id_medicamento}">
              ${medicamento.nombre_comercial} • ${medicamento.presentacion || medicamento.principio_activo}
            </option>
          `,
        )
        .join("");
    document.getElementById("metric-medicamentos").textContent = String(
      state.medicamentos.length,
    );
  }

  function renderNotes(notas) {
    if (!notas.length) {
      notesList.innerHTML = `
        <div class="timeline-item">
          <span class="timeline-marker marker-primary"></span>
          <div>
            <strong>Sin notas todavía</strong>
            <small>Cuando guardes una, aparecerá aquí.</small>
          </div>
        </div>
      `;
      return;
    }

    notesList.innerHTML = notas
      .map(
        (nota, index) => `
          <div class="timeline-item">
            <span class="timeline-marker ${index === 0 ? "marker-accent" : "marker-primary"}"></span>
            <div>
              <strong>${formatDate(nota.created_at)}</strong>
              <small>${nota.contenido}</small>
            </div>
          </div>
        `,
      )
      .join("");
  }

  function renderActivePrescriptions(prescripciones) {
    document.getElementById("hero-active-count").textContent = String(
      prescripciones.length,
    );
    document.getElementById("metric-horarios").textContent = String(
      prescripciones.filter((item) =>
        ["cada_8_horas", "cada_12_horas", "dias_alternos", "solo_fines_de_semana"].includes(
          item.patron_horario,
        ),
      ).length,
    );
    document.getElementById("metric-alertas").textContent = String(
      prescripciones.filter((item) => Number(item.porcentaje_adherencia) < 70).length,
    );
    document.getElementById("hero-last-update").textContent = prescripciones.length
      ? formatDate(prescripciones[0].proxima_toma || new Date())
      : "Sin movimientos";

    if (!prescripciones.length) {
      activePrescriptionsList.innerHTML = `
        <article class="patient-card">
          <div class="patient-avatar">--</div>
          <div>
            <h4>No hay recetas activas</h4>
            <div class="patient-meta">Puedes crear una nueva receta desde el formulario.</div>
          </div>
          <span class="patient-status status-stable">Vacío</span>
        </article>
      `;
      return;
    }

    activePrescriptionsList.innerHTML = prescripciones
      .map(
        (item) => `
          <article class="patient-card">
            <div class="patient-avatar">${initials(item.nombre_comercial)}</div>
            <div>
              <h4>${item.nombre_comercial}</h4>
              <div class="patient-meta">
                ${item.dosis_instruccion} • ${item.patron_horario.replaceAll("_", " ")} • ${item.duracion_dias || 7} días
              </div>
              <div class="patient-meta">
                Próxima toma: ${item.proxima_toma ? formatDate(item.proxima_toma) : "Sin pendientes"} • Stock ${item.stock_estimado}
              </div>
            </div>
            <span class="patient-status ${
              Number(item.porcentaje_adherencia) < 70 ? "status-alert" : "status-stable"
            }">${item.porcentaje_adherencia}%</span>
            <div style="display:flex; gap:10px; margin-left:auto;">
              <button class="btn btn-secondary doctor-edit" data-id="${item.id_prescripcion}" type="button">Editar</button>
              <button class="btn btn-primary doctor-disable" data-id="${item.id_prescripcion}" type="button">Desactivar</button>
            </div>
          </article>
        `,
      )
      .join("");

    activePrescriptionsList.querySelectorAll(".doctor-edit").forEach((button) => {
      button.addEventListener("click", () => loadPrescriptionIntoForm(button.dataset.id));
    });
    activePrescriptionsList.querySelectorAll(".doctor-disable").forEach((button) => {
      button.addEventListener("click", () => disablePrescription(button.dataset.id));
    });
  }

  function findPrescriptionById(id) {
    const prescripciones = state.pacienteActual?.prescripciones || [];
    return prescripciones.find((item) => String(item.id_prescripcion) === String(id));
  }

  function loadPrescriptionIntoForm(id) {
    const prescripcion = findPrescriptionById(id);
    if (!prescripcion) return;
    medicationSelect.value = state.medicamentos.find(
      (item) => item.nombre_comercial === prescripcion.nombre_comercial,
    )?.id_medicamento || "";
    doseInput.value = prescripcion.dosis_instruccion;
    scheduleSelect.value = prescripcion.patron_horario;
    durationInput.value = prescripcion.duracion_dias || 7;
    stockInput.value = prescripcion.stock_estimado || 0;
    instructionsInput.value = prescripcion.indicaciones || "";
    prescriptionForm.dataset.editingId = prescripcion.id_prescripcion;
    renderSchedulePreview();
    showMessage("La receta fue cargada en el formulario para actualizarla.", "info");
    document.getElementById("pacientes").scrollIntoView({ behavior: "smooth" });
  }

  async function disablePrescription(id) {
    if (!confirm("¿Deseas desactivar esta prescripción?")) return;
    await MedAlertApi.apiJson(`/api/medicamentos/prescripcion/${id}`, {
      method: "DELETE",
    });
    showMessage("Prescripción desactivada correctamente.", "success");
    await loadSelectedPatientData();
  }

  async function loadSelectedPatientData() {
    const idPaciente = patientSelect.value;
    if (!idPaciente) {
      state.pacienteActual = null;
      updateHero(null);
      renderActivePrescriptions([]);
      renderNotes([]);
      return;
    }

    const patient = state.pacientes.find(
      (item) => String(item.id_paciente) === String(idPaciente),
    );
    state.pacienteActual = patient;
    updateHero(patient);
    calculateDose();

    const [prescripcionesData, notasData] = await Promise.all([
      MedAlertApi.apiJson(`/api/medicamentos/paciente/${idPaciente}`),
      MedAlertApi.apiJson(`/api/medicamentos/paciente/${idPaciente}/notas`),
    ]);

    state.pacienteActual.prescripciones = prescripcionesData.prescripciones;
    renderActivePrescriptions(prescripcionesData.prescripciones);
    renderNotes(notasData.notas);
  }

  async function loadData() {
    const [pacientesData, medicamentosData] = await Promise.all([
      MedAlertApi.apiJson("/api/medicamentos/pacientes"),
      MedAlertApi.apiJson("/api/medicamentos/catalogo"),
    ]);

    state.pacientes = pacientesData.pacientes;
    state.medicamentos = medicamentosData.medicamentos;

    renderPatientList();
    fillPatientSelect();
    fillMedicationSelect();
  }

  prescriptionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!patientSelect.value || !medicationSelect.value || !scheduleSelect.value) {
      showMessage("Debes seleccionar paciente, medicamento y frecuencia.", "error");
      return;
    }

    const payload = {
      id_paciente: Number(patientSelect.value),
      id_medicamento: Number(medicationSelect.value),
      dosis_instruccion: doseInput.value.trim(),
      patron_horario: scheduleSelect.value,
      duracion_dias: Number(durationInput.value || 7),
      stock_estimado: Number(stockInput.value || 0),
      indicaciones: instructionsInput.value.trim(),
    };

    const editingId = prescriptionForm.dataset.editingId;
    const button = document.getElementById("save-prescription-button");
    button.disabled = true;

    try {
      if (editingId) {
        await MedAlertApi.apiJson(`/api/medicamentos/prescripcion/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showMessage("Prescripción actualizada correctamente.", "success");
      } else {
        await MedAlertApi.apiJson("/api/medicamentos/prescribir", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showMessage("Prescripción creada correctamente.", "success");
      }

      prescriptionForm.reset();
      prescriptionForm.dataset.editingId = "";
      durationInput.value = 7;
      stockInput.value = 30;
      renderSchedulePreview();
      await loadSelectedPatientData();
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  noteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!patientSelect.value) {
      showMessage("Selecciona primero un paciente para guardar la nota.", "error");
      return;
    }

    const button = document.getElementById("save-note-button");
    button.disabled = true;
    try {
      await MedAlertApi.apiJson("/api/medicamentos/notas", {
        method: "POST",
        body: JSON.stringify({
          id_paciente: Number(patientSelect.value),
          contenido: noteContent.value.trim(),
        }),
      });
      noteContent.value = "";
      showMessage("Nota remota guardada correctamente.", "success");
      await loadSelectedPatientData();
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  patientSelect.addEventListener("change", () => {
    loadSelectedPatientData().catch((error) => showMessage(error.message, "error"));
  });
  doseRule.addEventListener("change", calculateDose);
  scheduleSelect.addEventListener("change", renderSchedulePreview);
  document
    .getElementById("refresh-active-button")
    .addEventListener("click", () =>
      loadSelectedPatientData().catch((error) => showMessage(error.message, "error")),
    );
  document
    .getElementById("focus-recipe-button")
    .addEventListener("click", () =>
      document.getElementById("pacientes").scrollIntoView({ behavior: "smooth" }),
    );
  document
    .getElementById("focus-active-button")
    .addEventListener("click", () =>
      document.getElementById("agenda").scrollIntoView({ behavior: "smooth" }),
    );
  logoutButton.addEventListener("click", () => MedAlertApi.logout());

  renderSchedulePreview();
  loadData()
    .then(() => {
      if (state.pacientes[0]) {
        patientSelect.value = state.pacientes[0].id_paciente;
        return loadSelectedPatientData();
      }
      return null;
    })
    .catch((error) => showMessage(error.message, "error"));
});
