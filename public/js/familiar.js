document.addEventListener("DOMContentLoaded", () => {
  const usuario = MedAlertApi.getUsuario();
  if (!usuario || usuario.rol !== "familiar") {
    MedAlertApi.clearSession();
    window.location.href = "/pages/index.html";
    return;
  }

  // ID del paciente vinculado, se rellena al cargar datos
  let pacienteIdActual = null;

  function formatDate(dateString) {
    if (!dateString) return "Sin dato";
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateString));
  }

  function initials(name) {
    return String(name || "FM")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0])
      .join("")
      .toUpperCase();
  }

  // ─── Descarga autenticada de reportes ──────────────────────────────────────
  async function descargarReporte(tipo) {
    const msg = document.getElementById("familiar-reporte-msg");

    if (!pacienteIdActual) {
      if (msg) {
        msg.style.display = "block";
        msg.style.color = "#dc2626";
        msg.textContent = "No hay paciente vinculado para exportar el reporte.";
      }
      return;
    }

    const btnId = tipo === "pdf" ? "btn-familiar-pdf" : "btn-familiar-excel";
    const btn = document.getElementById(btnId);
    const textoOriginal = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = `<span class="icono-reporte">\u23F3</span><span><strong>Generando reporte\u2026</strong><small>Espera un momento</small></span>`;
    if (msg) { msg.style.display = "none"; }

    try {
      const url = `/api/medicamentos/paciente/${pacienteIdActual}/reporte/${tipo}`;
      const resp = await MedAlertApi.apiFetch(url);

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.mensaje || "Error al generar el reporte.");
      }

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

      if (msg) {
        msg.style.display = "block";
        msg.style.color = "#16a34a";
        msg.textContent = `\u2713 Reporte descargado: ${filename}`;
      }
    } catch (error) {
      if (msg) {
        msg.style.display = "block";
        msg.style.color = "#dc2626";
        msg.textContent = `Error: ${error.message}`;
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = textoOriginal;
    }
  }

  async function loadData() {
    document.getElementById("familiar-nombre").textContent =
      usuario.nombre_completo || "Familiar";
    document.getElementById("familiar-avatar").textContent = initials(
      usuario.nombre_completo,
    );

    const pacientesData = await MedAlertApi.apiJson("/api/medicamentos/pacientes");
    const paciente = pacientesData.pacientes[0];

    if (!paciente) {
      document.getElementById("mensaje-alerta").textContent =
        "Este familiar todav\u00eda no tiene un paciente vinculado.";
      return;
    }

    // Guardamos el ID para los botones de reporte
    pacienteIdActual = paciente.id_paciente;

    const [resumenData, prescripcionesData, tomasData, notasData] = await Promise.all([
      MedAlertApi.apiJson(`/api/medicamentos/paciente/${paciente.id_paciente}/resumen`),
      MedAlertApi.apiJson(`/api/medicamentos/paciente/${paciente.id_paciente}`),
      MedAlertApi.apiJson(`/api/medicamentos/paciente/${paciente.id_paciente}/tomas`),
      MedAlertApi.apiJson(`/api/medicamentos/paciente/${paciente.id_paciente}/notas`),
    ]);

    const resumen = resumenData.paciente;
    const metricas = resumenData.metricas;
    const comparativo = resumenData.comparativo;
    const proxima = resumenData.proxima_toma;

    document.getElementById("dashboard-paciente").textContent = resumen.nombre_completo;
    document.getElementById("dashboard-adherencia").textContent = `${metricas.porcentaje_adherencia}%`;
    document.getElementById("dashboard-omitidas").textContent = String(metricas.omitidos);
    document.getElementById("dashboard-proxima").textContent = proxima
      ? formatDate(proxima.fecha_hora_programada)
      : "Sin pendientes";

    const alerta = metricas.porcentaje_adherencia < 70;
    document.getElementById("badge-riesgo").textContent = alerta
      ? "Atenci\u00f3n requerida"
      : "Estable";
    document.getElementById("mensaje-alerta").textContent = alerta
      ? "La adherencia del paciente est\u00e1 por debajo del 70%. Se recomienda dar seguimiento."
      : "La adherencia del paciente se mantiene en un rango aceptable.";

    document.getElementById("resumen-paciente").textContent = resumen.nombre_completo;
    document.getElementById("resumen-edad").textContent = `${resumen.edad} a\u00f1os`;
    document.getElementById("resumen-diagnostico").textContent =
      resumen.historial_clinico || "Sin historial cl\u00ednico";
    document.getElementById("resumen-medico").textContent =
      resumen.medico_nombre || "Sin m\u00e9dico";
    document.getElementById("resumen-ultima-toma").textContent = tomasData.tomas[0]
      ? formatDate(tomasData.tomas[0].fecha_hora_real || tomasData.tomas[0].fecha_hora_programada)
      : "Sin tomas";

    document.getElementById("grafica-actual").textContent = `${comparativo.semana_actual}%`;
    document.getElementById("grafica-anterior").textContent = `${comparativo.semana_anterior}%`;
    document.getElementById("barra-actual").style.height = `${Math.max(
      comparativo.semana_actual,
      8,
    )}%`;
    document.getElementById("barra-anterior").style.height = `${Math.max(
      comparativo.semana_anterior,
      8,
    )}%`;

    document.getElementById("detalle-nombre").textContent = resumen.nombre_completo;
    document.getElementById("detalle-edad").textContent = `${resumen.edad} a\u00f1os`;
    document.getElementById("detalle-peso").textContent = `${resumen.peso_kg || "N/D"} kg`;
    document.getElementById("detalle-estatura").textContent = `${
      resumen.estatura_cm || "N/D"
    } cm`;
    document.getElementById("detalle-alergias").textContent =
      resumen.alergias || "Sin alergias";

    document.getElementById("detalle-adherencia").textContent =
      `${metricas.porcentaje_adherencia}%`;
    document.getElementById("detalle-estado").textContent = alerta ? "Riesgo" : "Estable";
    document.getElementById("detalle-medicamentos").textContent = String(
      prescripcionesData.prescripciones.length,
    );
    document.getElementById("detalle-cumplidas").textContent = String(metricas.cumplidos);
    document.getElementById("detalle-omitidas").textContent = String(metricas.omitidos);

    document.getElementById("detalle-notas").innerHTML = notasData.notas.length
      ? notasData.notas
          .map(
            (nota) =>
              `<p><strong>${formatDate(nota.created_at)}:</strong> ${nota.contenido}</p>`,
          )
          .join("")
      : "<p>No hay notas cl\u00ednicas registradas todav\u00eda.</p>";

    document.getElementById("tabla-medicamentos").innerHTML =
      prescripcionesData.prescripciones
        .map(
          (prescripcion) => `
            <tr>
              <td>${prescripcion.nombre_comercial}</td>
              <td>${prescripcion.dosis_instruccion}</td>
              <td>${prescripcion.patron_horario.replaceAll("_", " ")}</td>
              <td>${prescripcion.indicaciones || "Seg\u00fan receta"}</td>
              <td>${prescripcion.proxima_toma ? formatDate(prescripcion.proxima_toma) : "Sin pendientes"}</td>
              <td><span class="badge ${prescripcion.proxima_toma ? "proximo" : "activo"}">${prescripcion.proxima_toma ? "Pr\u00f3ximo" : "Activo"}</span></td>
            </tr>
          `,
        )
        .join("");

    document.getElementById("tabla-tomas").innerHTML = tomasData.tomas
      .map(
        (toma) => `
          <tr>
            <td>${formatDate(toma.fecha_hora_programada)}</td>
            <td>${toma.nombre_comercial}</td>
            <td>${formatDate(toma.fecha_hora_programada)}</td>
            <td>${toma.fecha_hora_real ? formatDate(toma.fecha_hora_real) : "No registrada"}</td>
            <td><span class="badge ${
              toma.estatus === "cumplido" ? "cumplida" : toma.estatus === "no_cumplido" ? "omitida" : "proximo"
            }">${toma.estatus.replaceAll("_", " ")}</span></td>
            <td>${toma.motivo_omision || toma.observaciones || "Sin observaciones"}</td>
          </tr>
        `,
      )
      .join("");

    const alertas = [];
    if (alerta) {
      alertas.push({
        clase: "grave",
        titulo: "Adherencia baja",
        texto: `La adherencia semanal del paciente baj\u00f3 a ${metricas.porcentaje_adherencia}%, por debajo del m\u00ednimo recomendado del 70%.`,
        fecha: "Generada hoy",
      });
    }
    const omitida = tomasData.tomas.find((item) => item.estatus === "no_cumplido");
    if (omitida) {
      alertas.push({
        clase: "media",
        titulo: "Toma omitida",
        texto: `El paciente omiti\u00f3 ${omitida.nombre_comercial}. Motivo: ${omitida.motivo_omision || "sin especificar"}.`,
        fecha: formatDate(omitida.fecha_hora_programada),
      });
    }
    if (proxima) {
      alertas.push({
        clase: "leve",
        titulo: "Pr\u00f3xima toma",
        texto: `La pr\u00f3xima toma programada es ${proxima.nombre_comercial} a las ${formatDate(
          proxima.fecha_hora_programada,
        )}.`,
        fecha: "Pendiente",
      });
    }

    document.getElementById("lista-alertas").innerHTML = alertas
      .map(
        (alertaItem) => `
          <div class="alerta-card ${alertaItem.clase}">
            <h3>${alertaItem.titulo}</h3>
            <p>${alertaItem.texto}</p>
            <span>${alertaItem.fecha}</span>
          </div>
        `,
      )
      .join("");
  }

  window.logout = () => MedAlertApi.logout();

  // ─── Wiring de botones de reporte ──────────────────────────────────────────
  const btnFamiliarPdf = document.getElementById("btn-familiar-pdf");
  const btnFamiliarExcel = document.getElementById("btn-familiar-excel");
  if (btnFamiliarPdf) btnFamiliarPdf.addEventListener("click", () => descargarReporte("pdf"));
  if (btnFamiliarExcel) btnFamiliarExcel.addEventListener("click", () => descargarReporte("excel"));

  loadData().catch((error) => {
    document.getElementById("mensaje-alerta").textContent = error.message;
  });
});
