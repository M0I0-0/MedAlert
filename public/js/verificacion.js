/* public/js/verificacion.js */
document.addEventListener("DOMContentLoaded", () => {
  // ─── Control de Sesión y Perfil del Usuario ───
  const usuario = MedAlertApi.getUsuario();
  
  if (!usuario) {
    // Si no está autenticado, enviar a login
    window.location.href = "/pages/index.html";
    return;
  }

  // Cargar perfil en la barra lateral
  const letterAvatar = document.getElementById("badge-avatar-letter");
  const userRole = document.getElementById("badge-user-role");
  const userName = document.getElementById("badge-user-name");
  const userSub = document.getElementById("badge-user-sub");
  const backLink = document.getElementById("back-to-panel-link");

  if (usuario.nombre_completo) {
    letterAvatar.textContent = usuario.nombre_completo.charAt(0).toUpperCase();
    userName.textContent = usuario.nombre_completo;
  } else if (usuario.correo) {
    letterAvatar.textContent = usuario.correo.charAt(0).toUpperCase();
    userName.textContent = usuario.correo;
  }
  
  userRole.textContent = usuario.rol;
  
  // Detalle descriptivo por rol
  const subtitlesByRole = {
    medico: "Seguimiento Clínico",
    familiar: "Cuidado Familiar",
    paciente: "Paciente Activo",
    farmaceutico: "Control Farmacia"
  };
  userSub.textContent = subtitlesByRole[usuario.rol] || "Auditoría";

  // Configurar enlace de retorno dinámico según el rol
  const dashboardByRole = {
    medico: "/pages/interfazDoctor.html",
    familiar: "/pages/vistafamiliar.html",
    paciente: "/pages/interfazpaciente.html",
    farmaceutico: "/pages/InterfazFarmaceutico.html"
  };
  backLink.href = dashboardByRole[usuario.rol] || "/pages/index.html";

  // Manejador del botón de cerrar sesión
  const logoutBtn = document.getElementById("logout-button");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      MedAlertApi.logout();
    });
  }

  // ─── Lógica de Verificación de Firma Criptográfica ───
  const verifyForm = document.getElementById("verify-form");
  const hashInput = document.getElementById("hash-input");
  const resultArea = document.getElementById("result-area");
  
  const initialStateHtml = document.getElementById("initial-state").outerHTML;

  verifyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const hash = hashInput.value.trim().toLowerCase();
    
    // Validar formato en cliente (64 caracteres hex)
    const hexRegex = /^[a-f0-9]{64}$/;
    if (!hexRegex.test(hash)) {
      renderErrorCard("Formato de hash inválido. Debe ser un código hexadecimal de exactamente 64 caracteres.");
      return;
    }

    // Mostrar spinner de carga
    resultArea.innerHTML = `
      <div class="state-card" id="loading-state">
        <div class="icon-badge">
          <i class="fa-solid fa-spinner fa-spin" style="color: var(--azul-principal);"></i>
        </div>
        <h3>Validando firma digital...</h3>
        <p>Consultando firmas registradas e integridad del contenido.</p>
      </div>
    `;

    try {
      // Hacer llamada API segura
      const data = await MedAlertApi.apiJson(`/api/medicamentos/reporte/verificar/${hash}`);
      
      if (data.ok && data.verificado) {
        renderSuccessResult(data.datos_firma);
      } else {
        renderErrorCard(data.mensaje || "Firma digital no registrada o documento alterado.");
      }
    } catch (err) {
      renderErrorCard(err.message || "Error al realizar la verificación con el servidor.");
    }
  });

  // Renderizar error de validación
  function renderErrorCard(message) {
    resultArea.innerHTML = `
      <div class="state-card state-error" style="animation: fadeIn 0.3s ease-out;">
        <div class="icon-badge">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3>Verificación Fallida</h3>
        <p>${message}</p>
      </div>
    `;
  }

  // Formatear fechas de manera uniforme
  function fmtFechaLocal(fechaStr) {
    if (!fechaStr) return "N/D";
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(fechaStr));
  }

  // Renderizar éxito con todos los metadatos de auditoría
  function renderSuccessResult(datosFirma) {
    const { tipo_reporte, hash_sha256, timestamp, datos_origen } = datosFirma;
    const { paciente, metricas, prescripciones = [], tomas_resumen = [] } = datos_origen;

    const adherencia = Number(metricas.porcentaje_adherencia || 0);
    let adherenceClass = "adherence-low";
    if (adherencia >= 80) adherenceClass = "adherence-high";
    else if (adherencia >= 60) adherenceClass = "adherence-mid";

    // Reconstruir interfaz de resultados
    let html = `
      <!-- Cabecera de éxito -->
      <div class="state-card state-success" style="animation: fadeIn 0.3s ease-out; width: 100%;">
        <div class="icon-badge">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <h3>Documento Verificado e Íntegro</h3>
        <p>${datosFirma.tipo_reporte} firmado criptográficamente. Coincide plenamente con las métricas del servidor de MedAlert.</p>
      </div>

      <!-- Grid de detalles -->
      <div class="details-grid">
        <!-- Tarjeta de Metadatos de la Firma -->
        <div class="details-card">
          <h4><i class="fa-solid fa-receipt"></i> Evidencia Digital</h4>
          <div class="metadata-list">
            <div class="metadata-item">
              <span class="metadata-label">Tipo de Reporte</span>
              <span class="metadata-value">${tipo_reporte}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Fecha de Firma</span>
              <span class="metadata-value">${fmtFechaLocal(timestamp)}</span>
            </div>
            <div class="metadata-item" style="flex-direction: column; gap: 4px; border-bottom: none;">
              <span class="metadata-label">Firma Única (SHA-256)</span>
              <span class="metadata-value" style="font-family: monospace; font-size: 0.76rem; word-break: break-all; color: var(--azul-tag);">
                ${hash_sha256}
              </span>
            </div>
          </div>
        </div>

        <!-- Tarjeta de Datos del Paciente -->
        <div class="details-card">
          <h4><i class="fa-solid fa-user-injured"></i> Datos del Paciente</h4>
          <div class="metadata-list">
            <div class="metadata-item">
              <span class="metadata-label">Nombre Completo</span>
              <span class="metadata-value">${paciente.nombre_completo}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Médico Asignado</span>
              <span class="metadata-value">${paciente.medico_nombre}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Edad del Paciente</span>
              <span class="metadata-value">${paciente.edad ? paciente.edad + ' años' : 'N/D'}</span>
            </div>
          </div>
        </div>

        <!-- Tarjeta de Adherencia en ese Instante (Full Width) -->
        <div class="details-card grid-full-width">
          <h4><i class="fa-solid fa-chart-line"></i> Nivel de Adherencia al Exportar</h4>
          
          <div class="adherence-badge-verify ${adherenceClass}">
            ${adherencia}% de Adherencia
          </div>

          <div class="metadata-list" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px;">
            <div class="metadata-item" style="flex-direction: column; align-items: center; border-bottom: none; background: var(--fondo-claro); padding: 12px; border-radius: 12px;">
              <span class="metadata-label">Tomas Programadas</span>
              <span class="metadata-value" style="font-size: 1.2rem; margin-top: 4px;">${metricas.total_tomas_programadas}</span>
            </div>
            <div class="metadata-item" style="flex-direction: column; align-items: center; border-bottom: none; background: rgba(22, 163, 74, 0.08); padding: 12px; border-radius: 12px;">
              <span class="metadata-label" style="color: var(--success);">Tomas Cumplidas</span>
              <span class="metadata-value" style="font-size: 1.2rem; margin-top: 4px; color: var(--success);">${metricas.total_tomas_cumplidas}</span>
            </div>
            <div class="metadata-item" style="flex-direction: column; align-items: center; border-bottom: none; background: rgba(220, 38, 38, 0.08); padding: 12px; border-radius: 12px;">
              <span class="metadata-label" style="color: var(--danger);">Tomas Omitidas</span>
              <span class="metadata-value" style="font-size: 1.2rem; margin-top: 4px; color: var(--danger);">${metricas.total_tomas_omitidas}</span>
            </div>
          </div>
        </div>

        <!-- Tarjeta de Recetas (Snapshot) -->
        <div class="details-card grid-full-width">
          <h4><i class="fa-solid fa-prescription-bottle-medical"></i> Tratamientos en Reporte</h4>
          <div class="table-responsive">
            <table class="verification-table">
              <thead>
                <tr>
                  <th>Medicamento</th>
                  <th>Dosis</th>
                  <th>Horario Frecuencia</th>
                </tr>
              </thead>
              <tbody>
    `;

    if (prescripciones.length === 0) {
      html += `<tr><td colspan="3" style="text-align: center; color: var(--texto-secundario);">Sin recetas activas en el reporte.</td></tr>`;
    } else {
      prescripciones.forEach(p => {
        html += `
          <tr>
            <td><strong>${p.nombre_comercial}</strong></td>
            <td>${p.dosis_instruccion}</td>
            <td>${p.patron_horario.replace(/_/g, " ")}</td>
          </tr>
        `;
      });
    }

    html += `
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tarjeta de Historial (Snapshot) -->
        <div class="details-card grid-full-width">
          <h4><i class="fa-solid fa-clock-rotate-left"></i> Historial Reciente Firmado</h4>
          <div class="table-responsive">
            <table class="verification-table">
              <thead>
                <tr>
                  <th>Medicamento</th>
                  <th>Programada</th>
                  <th>Realización</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
    `;

    if (tomas_resumen.length === 0) {
      html += `<tr><td colspan="4" style="text-align: center; color: var(--texto-secundario);">Sin tomas registradas en el reporte.</td></tr>`;
    } else {
      tomas_resumen.forEach(t => {
        const estClass = t.estatus;
        const estText = t.estatus.replace(/_/g, " ");
        html += `
          <tr>
            <td><strong>${t.nombre_comercial}</strong></td>
            <td>${fmtFechaLocal(t.fecha_hora_programada)}</td>
            <td>${t.fecha_hora_real ? fmtFechaLocal(t.fecha_hora_real) : "N/D"}</td>
            <td><span class="pill-estatus ${estClass}">${estText}</span></td>
          </tr>
        `;
      });
    }

    html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    resultArea.innerHTML = html;
  }
});
