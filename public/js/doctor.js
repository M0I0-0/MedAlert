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
  const historyList = document.getElementById("prescription-history-list");
  const hospitalForm = document.getElementById("hospital-form");
  const hospitalTomasList = document.getElementById("hospital-tomas-list");
  const stockAlertsList = document.getElementById("stock-alerts-list");
  const omissionReportsList = document.getElementById("omission-reports-list");
  const btnDownloadPdf = document.getElementById("btn-download-pdf");
  const btnDownloadExcel = document.getElementById("btn-download-excel");

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
    const activePresc = prescripciones.filter((item) => item.activa === 1);
    const inactivePresc = prescripciones.filter((item) => item.activa === 0);

    document.getElementById("hero-active-count").textContent = String(
      activePresc.length,
    );
    document.getElementById("metric-horarios").textContent = String(
      activePresc.filter((item) =>
        ["cada_8_horas", "cada_12_horas", "dias_alternos", "solo_fines_de_semana"].includes(
          item.patron_horario,
        ),
      ).length,
    );
    document.getElementById("metric-alertas").textContent = String(
      activePresc.filter((item) => Number(item.porcentaje_adherencia) < 70).length,
    );
    document.getElementById("hero-last-update").textContent = activePresc.length
      ? formatDate(activePresc[0].proxima_toma || new Date())
      : "Sin movimientos";

    // 1. Renderizar lista activa
    if (!activePresc.length) {
      activePrescriptionsList.innerHTML = `
        <article class="patient-card">
          <div class="patient-avatar">--</div>
          <div>
            <h4>No hay recetas activas</h4>
            <div class="patient-meta">Puedes crear una nueva receta desde el formulario o reactivar una inactiva abajo.</div>
          </div>
          <span class="patient-status status-stable">Vacío</span>
        </article>
      `;
    } else {
      activePrescriptionsList.innerHTML = activePresc
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
                <button class="btn btn-secondary doctor-history" data-id="${item.id_prescripcion}" type="button">Historial</button>
                <button class="btn btn-primary doctor-disable" data-id="${item.id_prescripcion}" type="button">Desactivar</button>
              </div>
            </article>
          `,
        )
        .join("");

      activePrescriptionsList.querySelectorAll(".doctor-edit").forEach((button) => {
        button.addEventListener("click", () => loadPrescriptionIntoForm(button.dataset.id));
      });
      activePrescriptionsList.querySelectorAll(".doctor-history").forEach((button) => {
        button.addEventListener("click", () => loadPrescriptionHistory(button.dataset.id));
      });
      activePrescriptionsList.querySelectorAll(".doctor-disable").forEach((button) => {
        button.addEventListener("click", () => disablePrescription(button.dataset.id));
      });
    }

    // 2. Renderizar lista inactiva
    const inactiveContainer = document.getElementById("inactive-prescriptions-list");
    if (!inactiveContainer) return;

    if (!inactivePresc.length) {
      inactiveContainer.innerHTML = `
        <article class="patient-card">
          <div class="patient-avatar">--</div>
          <div>
            <h4>Sin recetas inactivas</h4>
            <div class="patient-meta">No hay tratamientos desactivados para este paciente.</div>
          </div>
          <span class="patient-status status-stable">Vacío</span>
        </article>
      `;
    } else {
      inactiveContainer.innerHTML = inactivePresc
        .map(
          (item) => `
            <article class="patient-card" style="opacity: 0.75;">
              <div class="patient-avatar" style="background-color: var(--fondo-secundario); color: var(--texto-secundario);">
                ${initials(item.nombre_comercial)}
              </div>
              <div>
                <h4>${item.nombre_comercial} <span style="font-size: 11px; background: var(--fondo-secundario); padding: 2px 8px; border-radius: 10px; color: var(--texto-secundario); margin-left: 6px;">Inactivo</span></h4>
                <div class="patient-meta">
                  ${item.dosis_instruccion} • ${item.patron_horario.replaceAll("_", " ")} • ${item.duracion_dias || 7} días
                </div>
                <div class="patient-meta">
                  Desactivada • Adherencia registrada: ${item.porcentaje_adherencia}%
                </div>
              </div>
              <span class="patient-status status-stable" style="background-color: var(--fondo-secundario); color: var(--texto-secundario);">${item.porcentaje_adherencia}%</span>
              <div style="display:flex; gap:10px; margin-left:auto;">
                <button class="btn btn-secondary doctor-history" data-id="${item.id_prescripcion}" type="button">Historial</button>
                <button class="btn btn-primary doctor-enable" data-id="${item.id_prescripcion}" type="button" style="background-color: var(--success); border-color: var(--success);">Activar</button>
              </div>
            </article>
          `,
        )
        .join("");

      inactiveContainer.querySelectorAll(".doctor-history").forEach((button) => {
        button.addEventListener("click", () => loadPrescriptionHistory(button.dataset.id));
      });
      inactiveContainer.querySelectorAll(".doctor-enable").forEach((button) => {
        button.addEventListener("click", () => enablePrescription(button.dataset.id));
      });
    }
  }

  function renderHospitalTomas(tomas) {
    const pendientes = tomas.filter((item) => item.estatus === "pendiente");
    if (!pendientes.length) {
      hospitalTomasList.innerHTML = `
        <div class="task-item">
          <span class="task-marker marker-primary"></span>
          <div>
            <strong>Sin tomas pendientes</strong>
            <small>No hay registros para procesar en lote.</small>
          </div>
        </div>
      `;
      return;
    }

    hospitalTomasList.innerHTML = pendientes
      .map(
        (toma) => `
          <label class="task-item">
            <input type="checkbox" class="hospital-toma-check" value="${toma.id_toma}" />
            <div>
              <strong>${toma.nombre_comercial}</strong>
              <small>${formatDate(toma.fecha_hora_programada)}</small>
            </div>
          </label>
        `,
      )
      .join("");
  }

  function renderOmissionReports(tomas) {
    const reportes = tomas
      .filter((item) => item.estatus === "no_cumplido")
      .sort(
        (a, b) =>
          new Date(b.fecha_hora_programada).getTime() -
          new Date(a.fecha_hora_programada).getTime(),
      )
      .slice(0, 6);

    if (!reportes.length) {
      omissionReportsList.innerHTML = `
        <div class="task-item">
          <span class="task-marker marker-primary"></span>
          <div>
            <strong>Sin omisiones reportadas</strong>
            <small>Cuando el paciente explique una omisión, aparecerá aquí.</small>
          </div>
        </div>
      `;
      return;
    }

    omissionReportsList.innerHTML = reportes
      .map(
        (toma) => `
          <div class="task-item">
            <span class="task-marker marker-danger"></span>
            <div>
              <strong>${toma.nombre_comercial} • ${formatDate(toma.fecha_hora_programada)}</strong>
              <small>Motivo: ${String(toma.motivo_omision || "otro").replaceAll("_", " ")}. ${toma.observaciones || "Sin explicación adicional."}</small>
            </div>
          </div>
        `,
      )
      .join("");
  }

  async function loadPrescriptionHistory(idPrescripcion) {
    try {
      const data = await MedAlertApi.apiJson(
        `/api/medicamentos/prescripcion/${idPrescripcion}/historial`,
      );
      if (!data.historial.length) {
        historyList.innerHTML = `
          <div class="timeline-item">
            <span class="timeline-marker marker-primary"></span>
            <div>
              <strong>Sin historial</strong>
              <small>Esta prescripción aún no tiene cambios registrados.</small>
            </div>
          </div>
        `;
        return;
      }

      historyList.innerHTML = data.historial
        .map(
          (item) => `
            <div class="timeline-item">
              <span class="timeline-marker marker-accent"></span>
              <div>
                <strong>${item.accion} • ${formatDate(item.fecha_modificacion)}</strong>
                <small>
                  ${item.medico_editor}: dosis anterior ${item.dosis_anterior || "N/D"},
                  horario anterior ${item.patron_anterior || "N/D"},
                  stock anterior ${item.stock_anterior ?? "N/D"}
                </small>
              </div>
            </div>
          `,
        )
        .join("");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function renderStockAlerts(alertas) {
    if (!alertas.length) {
      stockAlertsList.innerHTML = `
        <div class="task-item">
          <span class="task-marker marker-primary"></span>
          <div>
            <strong>Sin recargas urgentes</strong>
            <small>No hay tratamientos con stock bajo.</small>
          </div>
        </div>
      `;
      return;
    }

    stockAlertsList.innerHTML = alertas
      .map(
        (alerta) => `
          <div class="task-item">
            <span class="task-marker marker-danger"></span>
            <div>
              <strong>${alerta.paciente}</strong>
              <small>${alerta.nombre_comercial} • stock ${alerta.stock_estimado} • próxima ${alerta.proxima_toma ? formatDate(alerta.proxima_toma) : "sin pendiente"}</small>
            </div>
          </div>
        `,
      )
      .join("");
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

  async function enablePrescription(id) {
    if (!confirm("¿Deseas activar/reactivar esta prescripción?")) return;
    try {
      await MedAlertApi.apiJson(`/api/medicamentos/prescripcion/${id}/activar`, {
        method: "POST",
      });
      showMessage("Prescripción activada y tomas programadas correctamente.", "success");
      await loadSelectedPatientData();
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  // ─── Descarga autenticada de reportes ─────────────────────────────────────
  async function descargarReporte(tipo) {
    const idPaciente = patientSelect.value;
    if (!idPaciente) return;
    const url = `/api/medicamentos/paciente/${idPaciente}/reporte/${tipo}`;
    const btn = tipo === "pdf" ? btnDownloadPdf : btnDownloadExcel;
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generando...`;
    try {
      const resp = await MedAlertApi.apiFetch(url);
      if (!resp.ok) throw new Error("Error al generar el reporte.");
      const blob = await resp.blob();
      const disposition = resp.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : `reporte.${tipo === "pdf" ? "pdf" : "xlsx"}`;
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlObj;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(urlObj);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = textoOriginal;
    }
  }

  async function loadSelectedPatientData() {
    const idPaciente = patientSelect.value;
    if (!idPaciente) {
      state.pacienteActual = null;
      updateHero(null);
      renderActivePrescriptions([]);
      renderNotes([]);
      renderOmissionReports([]);
      btnDownloadPdf.disabled = true;
      btnDownloadExcel.disabled = true;
      return;
    }
    btnDownloadPdf.disabled = false;
    btnDownloadExcel.disabled = false;

    const patient = state.pacientes.find(
      (item) => String(item.id_paciente) === String(idPaciente),
    );
    state.pacienteActual = patient;
    updateHero(patient);
    calculateDose();

    const [prescripcionesData, notasData, tomasData] = await Promise.all([
      MedAlertApi.apiJson(`/api/medicamentos/paciente/${idPaciente}`),
      MedAlertApi.apiJson(`/api/medicamentos/paciente/${idPaciente}/notas`),
      MedAlertApi.apiJson(`/api/medicamentos/paciente/${idPaciente}/tomas`),
    ]);

    state.pacienteActual.prescripciones = prescripcionesData.prescripciones;
    state.pacienteActual.tomas = tomasData.tomas;
    renderActivePrescriptions(prescripcionesData.prescripciones);
    renderNotes(notasData.notas);
    renderHospitalTomas(tomasData.tomas);
    renderOmissionReports(tomasData.tomas);
  }

  async function loadData() {
    const [pacientesData, medicamentosData, stockData] = await Promise.all([
      MedAlertApi.apiJson("/api/medicamentos/pacientes"),
      MedAlertApi.apiJson("/api/medicamentos/catalogo"),
      MedAlertApi.apiJson("/api/medicamentos/stock/alertas"),
    ]);

    state.pacientes = pacientesData.pacientes;
    state.medicamentos = medicamentosData.medicamentos;

    renderPatientList();
    fillPatientSelect();
    fillMedicationSelect();
    renderStockAlerts(stockData.alertas);
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

  hospitalForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const checked = Array.from(
      hospitalTomasList.querySelectorAll(".hospital-toma-check:checked"),
    );
    if (!checked.length) {
      showMessage("Selecciona al menos una toma pendiente para registrar.", "error");
      return;
    }

    const payload = {
      registrado_por: document.getElementById("hospital-responsible").value.trim(),
      tomas: checked.map((input) => ({
        id_toma: Number(input.value),
        estatus: "cumplido",
        observaciones: "Registro hospitalario en lote",
      })),
    };

    const button = document.getElementById("hospital-save-button");
    button.disabled = true;
    try {
      await MedAlertApi.apiJson("/api/medicamentos/tomas/lote-hospitalario", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showMessage("Tomas hospitalarias registradas correctamente.", "success");
      await loadSelectedPatientData();
      const stockData = await MedAlertApi.apiJson("/api/medicamentos/stock/alertas");
      renderStockAlerts(stockData.alertas);
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
  btnDownloadPdf.addEventListener("click", () => descargarReporte("pdf"));
  btnDownloadExcel.addEventListener("click", () => descargarReporte("excel"));

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
