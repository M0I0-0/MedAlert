// public/js/farmaceutico.js

document.addEventListener("DOMContentLoaded", () => {
  // 1. EL "GUARD" DE SEGURIDAD
  const usuario = MedAlertApi.getUsuario();

  // Si no hay token, lo mandamos al login
  if (!usuario) {
    window.location.href = "/pages/index.html";
    return;
  }

  // Si intenta entrar alguien que no es farmacéutico, lo sacamos
  if (usuario.rol !== "farmaceutico") {
    alert("Acceso denegado. Esta vista es exclusiva para Farmacéuticos.");
    MedAlertApi.clearSession();
    window.location.href = "/pages/index.html";
    return;
  }

  // 2. CARGAR DATOS DEL USUARIO EN EL PERFIL
  document.getElementById("nombre-farmaceutico").textContent =
    usuario.nombre_completo;
});

function logout() {
  MedAlertApi.logout();
}

// ==========================================
// MÓDULO 1: DISPENSAR RECETAS (IZQUIERDA)
// ==========================================
async function buscarReceta() {
  const idPaciente = document.getElementById("input-receta").value;
  if (!idPaciente) return alert("Por favor, ingresa el ID del paciente.");

  const btn = document.getElementById("btn-buscar-receta");
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  try {
    const data = await MedAlertApi.apiJson(`/api/medicamentos/paciente/${idPaciente}`);
    const contenedor = document.getElementById("resultado-receta");
    mostrarRecetasCards(data.prescripciones, contenedor);
  } catch (error) {
    document.getElementById("resultado-receta").innerHTML = `<div class="empty-msg"><i class="fa-solid fa-circle-xmark" style="color:#ef4444;"></i><br>${error.message}</div>`;
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

async function dispensar(idPrescripcion) {
  if (confirm("¿Confirmas la entrega de este medicamento al paciente?")) {
    try {
      await MedAlertApi.apiJson(
        `/api/medicamentos/prescripcion/${idPrescripcion}/dispensar`,
        {
          method: "POST",
          body: JSON.stringify({ cantidad: 30 }),
        },
      );
      alert("Medicamento entregado y stock actualizado.");
      buscarReceta();
    } catch (error) {
      alert(error.message);
    }
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

  const btn = document.getElementById("btn-buscar-generico");
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  try {
    const data = await MedAlertApi.apiJson(`/api/medicamentos/catalogo`);
    const contenedor = document.getElementById("resultado-genericos");
    const resultados = data.medicamentos.filter(
      (m) =>
        m.principio_activo.toLowerCase().includes(principioBusqueda) ||
        m.nombre_comercial.toLowerCase().includes(principioBusqueda),
    );
    mostrarGenericosCards(resultados, contenedor, principioBusqueda);
  } catch (error) {
    document.getElementById("resultado-genericos").innerHTML = `<div class="empty-msg"><i class="fa-solid fa-triangle-exclamation"></i><br>${error.message}</div>`;
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
