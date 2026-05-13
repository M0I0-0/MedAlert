// public/js/farmaceutico.js

document.addEventListener("DOMContentLoaded", () => {
  // 1. EL "GUARD" DE SEGURIDAD
  const token = localStorage.getItem("accessToken");
  const usuarioRaw = localStorage.getItem("usuario");

  // Si no hay token, lo mandamos al login
  if (!token || !usuarioRaw) {
    window.location.href = "/pages/index.html";
    return;
  }

  const usuario = JSON.parse(usuarioRaw);

  // Si intenta entrar alguien que no es farmacéutico, lo sacamos
  if (usuario.rol !== "farmaceutico") {
    alert("Acceso denegado. Esta vista es exclusiva para Farmacéuticos.");
    localStorage.clear();
    window.location.href = "/pages/index.html";
    return;
  }

  // 2. CARGAR DATOS DEL USUARIO EN LA INTERFAZ
  document.getElementById("nombre-farmaceutico").textContent =
    usuario.nombre_completo;

  // 3. NAVEGACIÓN ENTRE PANELES
  const navItems = document.querySelectorAll(".nav-item");
  const panels = document.querySelectorAll(".panel");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      navItems.forEach((n) => n.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));

      item.classList.add("active");
      document.getElementById(item.dataset.target).classList.add("active");
    });
  });
});

function logout() {
  localStorage.clear();
  window.location.href = "/pages/index.html";
}

// --------------------------------------------------------
// FUNCIONES DE NEGOCIO (Conectadas a la API Real)
// --------------------------------------------------------

// 1. Buscar receta de un paciente en la base de datos
async function buscarReceta() {
  const idPaciente = document.getElementById("input-receta").value;
  if (!idPaciente)
    return alert("Ingresa un ID de paciente (Prueba con el ID 1 o 3).");

  const token = localStorage.getItem("accessToken");
  const btn = document.querySelector("#dispensar .btn-primary");
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando...';

  try {
    const response = await fetch(`/api/medicamentos/paciente/${idPaciente}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok && data.ok) {
      mostrarRecetas(data.prescripciones);
    } else {
      alert(data.mensaje || "No se encontró el paciente o no tienes permiso.");
      document.getElementById("resultado-receta").style.display = "none";
    }
  } catch (error) {
    console.error("Error fetching recetas:", error);
    alert("Error de conexión con el servidor.");
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-search"></i> Buscar Receta';
  }
}

function mostrarRecetas(prescripciones) {
  const tbody = document.getElementById("tabla-recetas");
  tbody.innerHTML = "";

  if (!prescripciones || prescripciones.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No hay recetas activas para este paciente.</td></tr>`;
  } else {
    prescripciones.forEach((presc) => {
      tbody.innerHTML += `
                <tr>
                    <td>
                        <strong>${presc.nombre_comercial}</strong><br>
                        <small style="color: #64748b;">${presc.principio_activo} - ${presc.presentacion}</small>
                    </td>
                    <td>
                        <strong>Dosis:</strong> ${presc.dosis_instruccion}<br>
                        <small><strong>Horario:</strong> ${presc.patron_horario.replace(/_/g, " ")}</small>
                    </td>
                    <td><span class="badge stock-ok">Stock: ${presc.stock_estimado}</span></td>
                    <td>
                        <button class="btn-primary" onclick="dispensar(${presc.id_prescripcion})" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                            <i class="fa-solid fa-check"></i> Entregar
                        </button>
                    </td>
                </tr>
            `;
    });
  }
  document.getElementById("resultado-receta").style.display = "block";
}

function dispensar(idPrescripcion) {
  if (confirm("¿Confirmas la entrega de este medicamento al paciente?")) {
    // Aquí a futuro se puede hacer un UPDATE para restar el stock_estimado
    alert(
      `¡Medicamento entregado exitosamente! (Prescripción #${idPrescripcion})`,
    );
    buscarReceta();
  }
}

// 2. Buscador de Equivalencias (Consulta el Catálogo Global)
async function buscarGenericos() {
  const principioBusqueda = document
    .getElementById("input-principio")
    .value.toLowerCase();
  if (!principioBusqueda)
    return alert("Ingresa un principio activo (Ej. Metformina o Aspirina).");

  const token = localStorage.getItem("accessToken");
  const btn = document.querySelector("#genericos .btn-primary");
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando...';

  try {
    const response = await fetch(`/api/medicamentos/catalogo`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (response.ok && data.ok) {
      // Filtramos el catálogo por el principio activo que escribió el farmacéutico
      const resultados = data.medicamentos.filter(
        (m) =>
          m.principio_activo.toLowerCase().includes(principioBusqueda) ||
          m.nombre_comercial.toLowerCase().includes(principioBusqueda),
      );
      mostrarGenericos(resultados, principioBusqueda);
    } else {
      alert("No se pudo cargar el catálogo de medicamentos.");
    }
  } catch (error) {
    console.error("Error fetching catálogo:", error);
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-vial"></i> Buscar Equivalencias';
  }
}

function mostrarGenericos(medicamentos, busqueda) {
  const tbody = document.getElementById("tabla-genericos");
  tbody.innerHTML = "";

  if (medicamentos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ef4444;">No se encontraron equivalencias para "${busqueda}".</td></tr>`;
    return;
  }

  medicamentos.forEach((med) => {
    tbody.innerHTML += `
            <tr>
                <td><strong>${med.nombre_comercial}</strong></td>
                <td>${med.principio_activo}</td>
                <td>${med.presentacion}</td>
                <td><span class="badge stock-ok">Disponible</span></td>
            </tr>
        `;
  });
}
