// public/js/adherencia.js

document.addEventListener("DOMContentLoaded", () => {
  // ─── Referencias DOM ────────────────────────────────────────────────────────
  const sessionRole = document.getElementById("session-role");
  const sessionAvatar = document.getElementById("session-avatar");
  const sessionName = document.getElementById("session-name");
  const sessionSub = document.getElementById("session-sub");
  const btnBackDashboard = document.getElementById("btn-back-dashboard");
  const btnPrintReport = document.getElementById("btn-print-report");
  const logoutBtn = document.getElementById("logout-btn");

  const filterPatientContainer = document.getElementById("filter-patient-container");
  const patientSelect = document.getElementById("patient-select-adherence");
  const monthSelect = document.getElementById("month-select-adherence");
  const btnGroupDay = document.getElementById("btn-group-day");
  const btnGroupWeek = document.getElementById("btn-group-week");

  const chartTitle = document.getElementById("chart-title");
  const chartCanvasContainer = document.getElementById("chart-canvas-container");
  const adherenceEmptyState = document.getElementById("adherence-empty-state");
  const errorMessage = document.getElementById("adherence-error-message");
  const errorText = document.getElementById("error-text");

  const gaugeCircleFill = document.getElementById("gauge-circle-fill");
  const gaugePercent = document.getElementById("gauge-percent");
  const gaugeMonthLabel = document.getElementById("gauge-month-label");
  const gaugeEval = document.getElementById("gauge-eval");

  const kpiTotalScheduled = document.getElementById("kpi-total-scheduled");
  const kpiTotalCompleted = document.getElementById("kpi-total-completed");
  const kpiTotalOmitted = document.getElementById("kpi-total-omitted");

  const thPeriodo = document.getElementById("th-periodo");
  const tableBody = document.getElementById("table-adherence-tbody");

  // ─── Variables de Estado Interno ──────────────────────────────────────────
  let usuario = null;
  let chartInstance = null;
  let agrupacionActual = "dia"; // 'dia' o 'semana'
  let pacienteSeleccionadoId = null;

  // ─── 1. Autenticación y Carga de Sesión ────────────────────────────────────
  function inicializarSesion() {
    usuario = MedAlertApi.getUsuario();
    if (!usuario) {
      MedAlertApi.clearSession();
      window.location.href = "/pages/index.html";
      return;
    }

    // Traducir roles para mostrar en el sidebar de forma estilizada
    const rolesMap = {
      administrador: { label: "Administrador", class: "admin", color: "#6b7280" },
      medico: { label: "Médico Clínico", class: "medico", color: "#0284c7" },
      farmaceutico: { label: "Farmacéutico", class: "farmaceutico", color: "#16a34a" },
      paciente: { label: "Paciente", class: "paciente", color: "#3b82f6" },
      familiar: { label: "Familiar / Cuidador", class: "familiar", color: "#f59e0b" }
    };

    const roleInfo = rolesMap[usuario.rol] || { label: usuario.rol, class: "user", color: "#3b82f6" };

    sessionRole.textContent = roleInfo.label;
    sessionRole.style.color = roleInfo.color;
    sessionName.textContent = usuario.nombre || usuario.correo;
    sessionAvatar.textContent = (usuario.nombre || "U").substring(0, 2).toUpperCase();
    sessionSub.textContent = usuario.correo;

    // Configurar botón Volver según el rol del usuario
    if (usuario.rol === "medico") {
      btnBackDashboard.href = "/doctor";
    } else if (usuario.rol === "paciente") {
      btnBackDashboard.href = "/paciente";
    } else if (usuario.rol === "familiar") {
      btnBackDashboard.href = "/pages/vistafamiliar.html";
    } else {
      btnBackDashboard.href = "/pages/index.html";
    }

    // Configurar fecha del mes por defecto (mes actual)
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    monthSelect.value = `${anio}-${mes}`;
  }

  // ─── 2. Cargar Pacientes según Rol ─────────────────────────────────────────
  async function cargarPacientes() {
    // Si el rol es paciente, no necesita select de paciente, consulta el suyo directamente
    if (usuario.rol === "paciente") {
      pacienteSeleccionadoId = usuario.id;
      filterPatientContainer.style.display = "none";
      await actualizarDashboard();
      return;
    }

    // Si es médico o familiar, habilitar selector
    filterPatientContainer.style.display = "flex";

    try {
      const response = await MedAlertApi.apiJson("/api/medicamentos/pacientes");
      if (!response.ok || !response.pacientes || response.pacientes.length === 0) {
        mostrarError("No tienes pacientes vinculados a tu cuenta.");
        patientSelect.innerHTML = `<option value="">Sin pacientes vinculados</option>`;
        return;
      }

      patientSelect.innerHTML = "";
      response.pacientes.forEach((paciente) => {
        const option = document.createElement("option");
        option.value = paciente.id_paciente;
        option.textContent = paciente.nombre_completo;
        patientSelect.appendChild(option);
      });

      // Validar si existe un id_paciente en los query params de la URL
      const urlParams = new URLSearchParams(window.location.search);
      const queryPatientId = urlParams.get("id_paciente");

      if (queryPatientId) {
        patientSelect.value = queryPatientId;
      }

      pacienteSeleccionadoId = patientSelect.value;
      await actualizarDashboard();
    } catch (err) {
      mostrarError("Error al cargar pacientes vinculados: " + err.message);
    }
  }

  // ─── 3. Consumir API y Actualizar Pantalla ──────────────────────────────────
  async function actualizarDashboard() {
    if (!pacienteSeleccionadoId) return;

    ocultarError();

    const mes = monthSelect.value;
    const agrupacion = agrupacionActual;

    try {
      const url = `/api/medicamentos/paciente/${pacienteSeleccionadoId}/adherencia-mensual?mes=${mes}&agrupar=${agrupacion}`;
      const response = await MedAlertApi.apiJson(url);

      if (!response.ok) {
        throw new Error(response.mensaje || "Error al consumir el servicio.");
      }

      // 3.1 Actualizar KPIs
      actualizarKPIs(response.resumen, response.mes);

      // 3.2 Actualizar Gráfico
      renderizarGrafico(response.datos, response.agrupacion);

      // 3.3 Actualizar Tabla Detallada
      actualizarTabla(response.datos, response.agrupacion);

    } catch (err) {
      mostrarError("Error al recuperar estadísticas de adherencia: " + err.message);
      limpiarPantallaPorError();
    }
  }

  // ─── 4. Renderizado de Elementos Visuales ──────────────────────────────────
  function actualizarKPIs(resumen, mesStr) {
    kpiTotalScheduled.textContent = resumen.total_tomas_programadas;
    kpiTotalCompleted.textContent = resumen.total_tomas_cumplidas;
    kpiTotalOmitted.textContent = resumen.total_tomas_omitidas;

    // Formatear etiqueta de mes a español amigable
    const [anio, mesNum] = mesStr.split("-");
    const nombresMeses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const mesNombre = nombresMeses[parseInt(mesNum, 10) - 1] || "Mes";
    gaugeMonthLabel.textContent = `${mesNombre} ${anio}`;

    // Actualizar Widget Circular
    const porcentaje = resumen.adherencia_mensual;
    gaugePercent.textContent = porcentaje;

    // Calcular rotación del círculo del gauge
    // El círculo completo es 360 grados, y empieza en -45 grados por diseño en css
    const rotationDeg = (porcentaje / 100) * 360 - 45;
    gaugeCircleFill.style.transform = `rotate(${rotationDeg}deg)`;

    // Aplicar estilo dinámico al badge y al círculo según nivel de adherencia
    gaugeEval.className = "adherence-eval-badge";
    
    if (resumen.sin_registros) {
      gaugeEval.textContent = "Sin registros";
      gaugeEval.classList.add("adherence-eval-empty");
      gaugeCircleFill.style.borderColor = "#cbd5e1";
    } else if (porcentaje >= 90) {
      gaugeEval.textContent = "Excelente";
      gaugeEval.classList.add("adherence-eval-excellent");
      gaugeCircleFill.style.borderColor = "#10b981"; // Verde esmeralda
    } else if (porcentaje >= 70) {
      gaugeEval.textContent = "Regular";
      gaugeEval.classList.add("adherence-eval-regular");
      gaugeCircleFill.style.borderColor = "#f59e0b"; // Ámbar/Naranja
    } else {
      gaugeEval.textContent = "Bajo nivel";
      gaugeEval.classList.add("adherence-eval-low");
      gaugeCircleFill.style.borderColor = "#ef4444"; // Rojo
    }
  }

  function renderizarGrafico(datos, agrupacion) {
    // Si no hay datos, mostrar empty state y ocultar canvas
    const sinRegistros = datos.every(d => d.tomas_programadas === 0);
    
    const canvas = document.getElementById("adherenceTrendChart");
    if (sinRegistros) {
      canvas.style.display = "none";
      adherenceEmptyState.style.display = "flex";
      chartTitle.textContent = "Sin registros para graficar";
      return;
    }

    canvas.style.display = "block";
    adherenceEmptyState.style.display = "none";

    chartTitle.textContent = agrupacion === "semana" 
      ? "Evolución Semanal de Adherencia" 
      : "Evolución Diaria de Adherencia";

    const labels = datos.map(d => d.label);
    const dataPercent = datos.map(d => d.adherencia);
    const dataProgramadas = datos.map(d => d.tomas_programadas);
    const dataCumplidas = datos.map(d => d.tomas_cumplidas);

    // Destruir instancia previa si existe para evitar solapamientos
    if (chartInstance) {
      chartInstance.destroy();
    }

    const ctx = canvas.getContext("2d");

    // Crear gradiente de color clínico suave
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "rgba(59, 130, 246, 0.4)");
    gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)");

    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Porcentaje de Adherencia",
          data: dataPercent,
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 3,
          backgroundColor: gradient,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: "rgba(255, 255, 255, 1)",
          pointBorderColor: "rgba(59, 130, 246, 1)",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: "rgba(8, 37, 92, 0.95)",
            titleColor: "#fff",
            bodyColor: "#f3f4f6",
            padding: 12,
            cornerRadius: 12,
            boxPadding: 6,
            callbacks: {
              label: function(context) {
                const index = context.dataIndex;
                const percent = context.raw;
                const prog = dataProgramadas[index];
                const cump = dataCumplidas[index];

                if (prog === 0) {
                  return "Sin registros en este periodo";
                }
                return [
                  `Adherencia: ${percent}%`,
                  `Tomas cumplidas: ${cump} de ${prog}`
                ];
              }
            }
          }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            grid: {
              color: "rgba(229, 231, 235, 0.6)"
            },
            ticks: {
              font: {
                family: "Outfit",
                size: 11
              },
              callback: function(value) {
                return value + "%";
              }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                family: "Outfit",
                size: 11
              }
            }
          }
        }
      }
    });
  }

  function actualizarTabla(datos, agrupacion) {
    thPeriodo.textContent = agrupacion === "semana" ? "Semana" : "Día";
    tableBody.innerHTML = "";

    datos.forEach((fila) => {
      const tr = document.createElement("tr");

      // Celda 1: Periodo/Label
      const tdLabel = document.createElement("td");
      tdLabel.style.fontWeight = "600";
      tdLabel.textContent = fila.label;
      tr.appendChild(tdLabel);

      // Celda 2: Programadas
      const tdProg = document.createElement("td");
      tdProg.textContent = fila.tomas_programadas;
      tr.appendChild(tdProg);

      // Celda 3: Cumplidas
      const tdCump = document.createElement("td");
      tdCump.textContent = fila.tomas_cumplidas;
      tr.appendChild(tdCump);

      // Celda 4: Omitidas
      const tdOmit = document.createElement("td");
      tdOmit.textContent = fila.tomas_omitidas;
      tr.appendChild(tdOmit);

      // Celda 5: Porcentaje
      const tdPercent = document.createElement("td");
      tdPercent.className = "table-adherence-percentage";
      
      if (fila.tomas_programadas > 0) {
        tdPercent.textContent = `${fila.adherencia}%`;
      } else {
        tdPercent.textContent = "-";
        tdPercent.style.color = "#94a3b8";
      }
      tr.appendChild(tdPercent);

      // Celda 6: Estado (Pill)
      const tdStatus = document.createElement("td");
      const spanStatus = document.createElement("span");
      
      if (fila.tomas_programadas > 0) {
        spanStatus.className = "table-adherence-status-pill has-records";
        spanStatus.textContent = "Con tomas";
      } else {
        spanStatus.className = "table-adherence-status-pill empty-records";
        spanStatus.textContent = "Sin registros";
      }
      tdStatus.appendChild(spanStatus);
      tr.appendChild(tdStatus);

      tableBody.appendChild(tr);
    });
  }

  // ─── 5. Control de Errores e Interfaz Limpia ───────────────────────────────
  function mostrarError(msg) {
    errorText.textContent = msg;
    errorMessage.style.display = "flex";
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function ocultarError() {
    errorMessage.style.display = "none";
  }

  function limpiarPantallaPorError() {
    kpiTotalScheduled.textContent = "0";
    kpiTotalCompleted.textContent = "0";
    kpiTotalOmitted.textContent = "0";
    gaugePercent.textContent = "0";
    gaugeCircleFill.style.transform = "rotate(-45deg)";
    gaugeCircleFill.style.borderColor = "#cbd5e1";
    gaugeEval.className = "adherence-eval-badge adherence-eval-empty";
    gaugeEval.textContent = "Sin datos";

    if (chartInstance) {
      chartInstance.destroy();
    }
    const canvas = document.getElementById("adherenceTrendChart");
    canvas.style.display = "none";
    adherenceEmptyState.style.display = "flex";
    chartTitle.textContent = "Sin registros para graficar";

    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--texto-secundario); padding: 24px;">
          No se pudieron cargar datos para este periodo.
        </td>
      </tr>
    `;
  }

  // ─── 6. Event Listeners ────────────────────────────────────────────────────
  
  // Cambiar selector de paciente
  patientSelect.addEventListener("change", () => {
    pacienteSeleccionadoId = patientSelect.value;
    actualizarDashboard();
  });

  // Cambiar selector de mes
  monthSelect.addEventListener("change", () => {
    actualizarDashboard();
  });

  // Cambiar agrupación a Día
  btnGroupDay.addEventListener("click", () => {
    if (agrupacionActual === "dia") return;
    agrupacionActual = "dia";
    btnGroupDay.classList.add("active");
    btnGroupWeek.classList.remove("active");
    actualizarDashboard();
  });

  // Cambiar agrupación a Semana
  btnGroupWeek.addEventListener("click", () => {
    if (agrupacionActual === "semana") return;
    agrupacionActual = "semana";
    btnGroupWeek.classList.add("active");
    btnGroupDay.classList.remove("active");
    actualizarDashboard();
  });

  // Imprimir Reporte
  btnPrintReport.addEventListener("click", (e) => {
    e.preventDefault();
    window.print();
  });

  // Cerrar Sesión
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    MedAlertApi.logout();
  });

  // ─── 7. Inicialización ─────────────────────────────────────────────────────
  inicializarSesion();
  cargarPacientes();
});
