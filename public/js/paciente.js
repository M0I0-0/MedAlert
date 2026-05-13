document.addEventListener("DOMContentLoaded", () => {
  const usuario = MedAlertApi.getUsuario();
  if (!usuario || usuario.rol !== "paciente") {
    MedAlertApi.clearSession();
    window.location.href = "/pages/index.html";
    return;
  }

  const medsContainer = document.getElementById("contenedor-medicamentos");
  const emptyState = document.getElementById("estado-vacio");
  const tomasContainer = document.getElementById("contenedor-tomas");
  const tomasEmpty = document.getElementById("estado-tomas");
  const patientMessage = document.getElementById("patient-message");

  function showMessage(message, type = "info") {
    patientMessage.style.display = "block";
    patientMessage.innerHTML = `<h3>${type === "error" ? "Atención" : "MedAlert"}</h3><p>${message}</p>`;
    patientMessage.style.background =
      type === "error" ? "#fef2f2" : type === "success" ? "#f0fdf4" : "#eff6ff";
    patientMessage.style.border = `1px solid ${
      type === "error" ? "#fecaca" : type === "success" ? "#bbf7d0" : "#bfdbfe"
    }`;
  }

  function formatDate(dateString) {
    if (!dateString) return "Sin dato";
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateString));
  }

  function relativeDiff(programada, real) {
    if (!programada || !real) return "Sin registro";
    const diffMinutes = Math.round(
      (new Date(real).getTime() - new Date(programada).getTime()) / 60000,
    );
    if (diffMinutes === 0) return "A tiempo";
    if (diffMinutes > 0) return `${diffMinutes} min de retraso`;
    return `${Math.abs(diffMinutes)} min de adelanto`;
  }

  async function marcarToma(idToma, estatus) {
    const payload = { estatus };

    if (estatus === "no_cumplido") {
      const motivo = prompt(
        "Motivo de omisión: olvido, efecto_adverso, falta_stock, decision_medica u otro",
        "olvido",
      );
      if (!motivo) return;
      const observaciones = prompt(
        "Observaciones o efectos adversos (opcional)",
        "",
      );
      payload.motivo_omision = motivo;
      payload.observaciones = observaciones || null;
      payload.omision_justificada = Number(motivo === "decision_medica");
    } else {
      const observaciones = prompt(
        "Observaciones de la toma (opcional, por ejemplo náusea o mareo)",
        "",
      );
      payload.observaciones = observaciones || null;
    }

    try {
      await MedAlertApi.apiJson(`/api/medicamentos/tomas/${idToma}/marcar`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showMessage("La toma fue registrada correctamente.", "success");
      await loadData();
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function renderPrescriptions(prescripciones, tomas) {
    const cards = prescripciones.map((prescripcion) => {
      const pending = tomas.find(
        (item) =>
          String(item.id_prescripcion) === String(prescripcion.id_prescripcion) &&
          item.estatus === "pendiente",
      );

      return `
        <div class="medicine-card">
          <div class="card-header">
            <div class="medicine-left">
              <div class="icon-box">
                <i class="fa-solid fa-capsules"></i>
              </div>
              <div>
                <h3>${prescripcion.nombre_comercial}</h3>
                <span class="status">${prescripcion.principio_activo}</span>
              </div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <span>Dosis</span>
              <p>${prescripcion.dosis_instruccion}</p>
            </div>
            <div class="info-box">
              <span>Frecuencia</span>
              <p>${prescripcion.patron_horario.replaceAll("_", " ")}</p>
            </div>
            <div class="info-box">
              <span>Duración</span>
              <p>${prescripcion.duracion_dias || 7} días</p>
            </div>
            <div class="info-box">
              <span>Próxima toma</span>
              <p>${prescripcion.proxima_toma ? formatDate(prescripcion.proxima_toma) : "Sin pendientes"}</p>
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-text">
              <span>Adherencia al tratamiento</span>
              <span>${prescripcion.porcentaje_adherencia}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress" style="width: ${prescripcion.porcentaje_adherencia}%"></div>
            </div>
          </div>

          <div class="info-box" style="margin-top: 16px;">
            <span>Indicaciones del médico</span>
            <p>${prescripcion.indicaciones || "Sin indicaciones adicionales."}</p>
          </div>

          <div class="action-buttons">
            <button class="details-btn" type="button" data-kind="details" data-id="${prescripcion.id_prescripcion}">
              <i class="fa-solid fa-circle-info"></i> Ver próxima toma
            </button>
            ${
              pending
                ? `
                  <button class="mark-btn" type="button" data-kind="cumplido" data-id="${pending.id_toma}">
                    <i class="fa-solid fa-check"></i> Marcar cumplido
                  </button>
                  <button class="details-btn" type="button" data-kind="omitido" data-id="${pending.id_toma}">
                    <i class="fa-solid fa-ban"></i> Omitir
                  </button>
                `
                : `
                  <button class="mark-btn" type="button" disabled>
                    <i class="fa-solid fa-check"></i> Sin tomas pendientes
                  </button>
                `
            }
          </div>
        </div>
      `;
    });

    medsContainer.innerHTML = cards.join("");
    if (cards.length) {
      emptyState.style.display = "none";
    }

    medsContainer.querySelectorAll("[data-kind='cumplido']").forEach((button) => {
      button.addEventListener("click", () => marcarToma(button.dataset.id, "cumplido"));
    });
    medsContainer.querySelectorAll("[data-kind='omitido']").forEach((button) => {
      button.addEventListener("click", () => marcarToma(button.dataset.id, "no_cumplido"));
    });
    medsContainer.querySelectorAll("[data-kind='details']").forEach((button) => {
      button.addEventListener("click", () => {
        const prescripcion = prescripciones.find(
          (item) => String(item.id_prescripcion) === String(button.dataset.id),
        );
        if (!prescripcion) return;
        alert(
          `Próxima toma: ${
            prescripcion.proxima_toma ? formatDate(prescripcion.proxima_toma) : "Sin pendientes"
          }\nStock estimado: ${prescripcion.stock_estimado}\nVersión de receta: ${prescripcion.version}`,
        );
      });
    });
  }

  function renderTomas(tomas) {
    const tarjetas = tomas.map(
      (toma) => `
        <div class="medicine-card">
          <div class="card-header">
            <div class="medicine-left">
              <div class="icon-box">
                <i class="fa-solid fa-clock"></i>
              </div>
              <div>
                <h3>${toma.nombre_comercial}</h3>
                <span class="status">${toma.estatus.replaceAll("_", " ")}</span>
              </div>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-box">
              <span>Hora programada</span>
              <p>${formatDate(toma.fecha_hora_programada)}</p>
            </div>
            <div class="info-box">
              <span>Hora real</span>
              <p>${toma.fecha_hora_real ? formatDate(toma.fecha_hora_real) : "No registrada"}</p>
            </div>
            <div class="info-box">
              <span>Diferencia</span>
              <p>${relativeDiff(toma.fecha_hora_programada, toma.fecha_hora_real)}</p>
            </div>
            <div class="info-box">
              <span>Motivo</span>
              <p>${toma.motivo_omision || "Sin observaciones"}</p>
            </div>
          </div>
          <div class="info-box" style="margin-top: 16px;">
            <span>Observaciones</span>
            <p>${toma.observaciones || "Sin observaciones."}</p>
          </div>
        </div>
      `,
    );

    tomasContainer.innerHTML = tarjetas.join("");
    if (tarjetas.length) {
      tomasEmpty.style.display = "none";
    }
  }

  async function loadData() {
    document.getElementById("nombre-paciente").textContent = usuario.nombre_completo;
    document.getElementById("id-farmacia").textContent = `ID #${usuario.id}`;
    document.getElementById("img-paciente").src =
      `https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.nombre_completo)}&size=300&background=dbeafe&color=2563eb`;

    const [resumenData, prescripcionesData, tomasData] = await Promise.all([
      MedAlertApi.apiJson(`/api/medicamentos/paciente/${usuario.id}/resumen`),
      MedAlertApi.apiJson(`/api/medicamentos/paciente/${usuario.id}`),
      MedAlertApi.apiJson(`/api/medicamentos/paciente/${usuario.id}/tomas`),
    ]);

    document.getElementById("alergias-paciente").textContent =
      resumenData.paciente.alergias || "Sin alergias registradas";

    if (!prescripcionesData.prescripciones.length) {
      emptyState.style.display = "block";
    } else {
      renderPrescriptions(prescripcionesData.prescripciones, tomasData.tomas);
    }

    if (tomasData.tomas.length) {
      renderTomas(tomasData.tomas);
    } else {
      tomasEmpty.style.display = "block";
    }
  }

  window.logout = () => MedAlertApi.logout();
  loadData().catch((error) => showMessage(error.message, "error"));
});
