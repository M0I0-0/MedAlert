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

  // 2. CARGAR DATOS DEL USUARIO EN EL PERFIL
  document.getElementById("nombre-farmaceutico").textContent =
    usuario.nombre_completo;
});

function logout() {
  localStorage.clear();
  window.location.href = "/pages/index.html";
}

// ==========================================
// MÓDULO 1: DISPENSAR RECETAS (IZQUIERDA)
// ==========================================
async function buscarReceta() {
  const idPaciente = document.getElementById("input-receta").value;
  if (!idPaciente) return alert("Por favor, ingresa el ID del paciente.");

  const token = localStorage.getItem("accessToken");
  const btn = document.getElementById("btn-buscar-receta");
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  try {
    const response = await fetch(`/api/medicamentos/paciente/${idPaciente}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    const contenedor = document.getElementById("resultado-receta");

    if (response.ok && data.ok) {
      mostrarRecetasCards(data.prescripciones, contenedor);
    } else {
      contenedor.innerHTML = `<div class="empty-msg"><i class="fa-solid fa-circle-xmark" style="color:#ef4444;"></i><br>Paciente no encontrado o sin recetas activas.</div>`;
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Buscar';
  }
}

function mostrarRecetasCards(prescripciones, contenedor) {
  if (!prescripciones || prescripciones.length === 0) {
    contenedor.innerHTML = `<div class="empty-msg"><i class="fa-solid fa-box-open"></i><br>No hay recetas activas.</div>`;
    return;
  }

  let htmlCards = "";
  prescripciones.forEach((presc) => {
    htmlCards += `
        <div class="result-card">
            <h5>${presc.nombre_comercial}</h5>
            <p><strong>Dosis:</strong> ${presc.dosis_instruccion}<br>
               <strong>Frecuencia:</strong> ${presc.patron_horario.replace(/_/g, " ")}</p>
            
            <div class="tags">
                <span>${presc.principio_activo}</span>
                <span class="success"><i class="fa-solid fa-cubes"></i> Stock: ${presc.stock_estimado}</span>
            </div>

            <button class="dispensar-btn" onclick="dispensar(${presc.id_prescripcion})">
                <i class="fa-solid fa-hand-holding-medical"></i> Entregar Medicamento
            </button>
        </div>
        `;
  });
  contenedor.innerHTML = htmlCards;
}

function dispensar(idPrescripcion) {
  if (confirm("¿Confirmas la entrega de este medicamento al paciente?")) {
    alert(
      `¡Medicamento entregado exitosamente! (ID Prescripción: ${idPrescripcion})`,
    );
    buscarReceta(); // Refrescar la lista
  }
}

// ==========================================
// MÓDULO 2: EQUIVALENCIAS (DERECHA)
// ==========================================
async function buscarGenericos() {
  const principioBusqueda = document
    .getElementById("input-principio")
    .value.toLowerCase();
  if (!principioBusqueda)
    return alert("Ingresa un principio activo para buscar.");

  const token = localStorage.getItem("accessToken");
  const btn = document.getElementById("btn-buscar-generico");
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  try {
    const response = await fetch(`/api/medicamentos/catalogo`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    const contenedor = document.getElementById("resultado-genericos");

    if (response.ok && data.ok) {
      const resultados = data.medicamentos.filter(
        (m) =>
          m.principio_activo.toLowerCase().includes(principioBusqueda) ||
          m.nombre_comercial.toLowerCase().includes(principioBusqueda),
      );
      mostrarGenericosCards(resultados, contenedor, principioBusqueda);
    } else {
      contenedor.innerHTML = `<div class="empty-msg"><i class="fa-solid fa-triangle-exclamation"></i><br>Error al cargar el catálogo.</div>`;
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Buscar';
  }
}

function mostrarGenericosCards(medicamentos, contenedor, busqueda) {
  if (medicamentos.length === 0) {
    contenedor.innerHTML = `<div class="empty-msg"><i class="fa-solid fa-magnifying-glass-minus"></i><br>No se encontraron equivalencias para "${busqueda}".</div>`;
    return;
  }

  let htmlCards = "";
  medicamentos.forEach((med) => {
    htmlCards += `
        <div class="result-card">
            <h5>${med.nombre_comercial}</h5>
            <p><strong>Presentación:</strong> ${med.presentacion}</p>
            
            <div class="tags">
                <span>${med.principio_activo}</span>
                <span class="success">Disponible</span>
            </div>
        </div>
        `;
  });
  contenedor.innerHTML = htmlCards;
}
