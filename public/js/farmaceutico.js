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
      // Quitar clase active de todos
      navItems.forEach((n) => n.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));

      // Activar el seleccionado
      item.classList.add("active");
      document.getElementById(item.dataset.target).classList.add("active");
    });
  });
});

// Función para cerrar sesión
function logout() {
  localStorage.clear();
  window.location.href = "/pages/index.html";
}

// --------------------------------------------------------
// FUNCIONES DE NEGOCIO (Conectadas a la API)
// --------------------------------------------------------

// Buscar receta de un paciente
async function buscarReceta() {
  const idPaciente = document.getElementById("input-receta").value;
  if (!idPaciente) return alert("Ingresa un ID de paciente.");

  const token = localStorage.getItem("accessToken");

  try {
    // Hacemos fetch al endpoint que creamos en medicamentoController.js
    const response = await fetch(`/api/medicamentos/paciente/${idPaciente}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (data.ok) {
      mostrarRecetas(data.medicamentos);
    } else {
      alert("No se encontró el paciente o no tienes permiso.");
    }
  } catch (error) {
    console.error("Error fetching recetas:", error);
  }
}

function mostrarRecetas(medicamentos) {
  const tbody = document.getElementById("tabla-recetas");
  tbody.innerHTML = ""; // Limpiar tabla

  if (medicamentos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No hay recetas activas para este paciente.</td></tr>`;
  } else {
    medicamentos.forEach((med) => {
      tbody.innerHTML += `
                <tr>
                    <td><strong>${med.nombre}</strong><br><small>${med.principio_activo}</small></td>
                    <td>${med.dosis}</td>
                    <td>Dr. Asignado</td>
                    <td>
                        <button class="btn-primary" onclick="dispensar(${med.id_medicamento})" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                            Entregar
                        </button>
                    </td>
                </tr>
            `;
    });
  }
  document.getElementById("resultado-receta").style.display = "block";
}

// Función simulada para marcar como entregado y actualizar stock
function dispensar(idMedicamento) {
  if (
    confirm(
      "¿Confirmas la entrega de este medicamento? Se descontará del stock.",
    )
  ) {
    // Aquí harías un fetch con método PUT para actualizar la BD
    alert(`Medicamento ID: ${idMedicamento} dispensado con éxito.`);
    buscarReceta(); // Recargar la lista
  }
}

// Buscar genéricos por principio activo
async function buscarGenericos() {
  const principio = document.getElementById("input-principio").value;
  if (!principio) return alert("Ingresa un principio activo.");

  // NOTA: Para que esto funcione real, necesitas crear una ruta en tu backend:
  // GET /api/medicamentos/genericos?principio=Metformina
  // Por ahora, simulamos la respuesta visualmente:

  const tbody = document.getElementById("tabla-genericos");
  tbody.innerHTML = `
        <tr>
            <td><strong>Glafornil (Marca)</strong></td>
            <td>${principio}</td>
            <td>Tabletas 850mg</td>
            <td><span class="badge stock-ok">60 cajas</span></td>
        </tr>
        <tr>
            <td><strong>Genérico Interfaz</strong></td>
            <td>${principio}</td>
            <td>Tabletas 850mg</td>
            <td><span class="badge stock-low">5 cajas</span></td>
        </tr>
    `;
}
