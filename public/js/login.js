// public/js/login.js

document.addEventListener("DOMContentLoaded", () => {
  const viewMeta = {
    login: {
      title: "Iniciar sesión",
      subtitle: "Ingresa tus credenciales para entrar al dashboard",
    },
    register: {
      title: "Crear cuenta",
      subtitle: "Selecciona tu rol para mostrar el formulario correcto",
    },
    recover: {
      title: "Recuperar contraseña",
      subtitle: "Verifica tu correo para recuperar el acceso",
    },
  };

  const navLinks = document.querySelectorAll(".nav-link");
  const panels = document.querySelectorAll(".auth-panel");
  const panelTitle = document.getElementById("panel-title");
  const panelSubtitle = document.getElementById("panel-subtitle");
  const authMessage = document.getElementById("auth-message");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const recoverForm = document.getElementById("recover-form");
  const registerRole = document.getElementById("register-rol");
  const roleFields = document.querySelectorAll(".role-field");
  const registerAfterRole = document.querySelectorAll(".register-after-role");
  const registerRoleHint = document.querySelector(".register-role-hint");

  function showMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = "auth-message " + type;
    authMessage.hidden = false;
  }

  function showMessageHtml(message, type) {
    authMessage.innerHTML = message;
    authMessage.className = "auth-message " + type;
    authMessage.hidden = false;
  }

  function clearMessage() {
    authMessage.hidden = true;
    authMessage.textContent = "";
    authMessage.className = "auth-message";
  }

  function setView(view) {
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.view === view);
    });

    panels.forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.panel !== view);
    });

    panelTitle.textContent = viewMeta[view].title;
    panelSubtitle.textContent = viewMeta[view].subtitle;
    clearMessage();
  }

  function updateRegisterFields() {
    const role = registerRole.value;
    const hasRole = Boolean(role);

    registerAfterRole.forEach((field) => {
      field.classList.toggle("hidden", !hasRole);
    });

    if (registerRoleHint) {
      registerRoleHint.classList.toggle("hidden", hasRole);
    }

    roleFields.forEach((field) => {
      const roleClasses = Array.from(field.classList).filter(
        (className) =>
          className.startsWith("role-") && className !== "role-field",
      );
      const shouldShow = hasRole && roleClasses.includes(`role-${role}`);

      field.classList.toggle("hidden", !shouldShow);

      field.querySelectorAll("input, select").forEach((input) => {
        if (!shouldShow) {
          input.value =
            input.tagName === "SELECT" ? input.options[0]?.value || "" : "";
        }
      });
    });
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setView(link.dataset.view);
    });
  });

  document.querySelectorAll("[data-view-trigger]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      setView(trigger.dataset.viewTrigger);
    });
  });

  document.querySelectorAll(".toggle-password").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.target);
      const icon = button.querySelector("i");
      const visible = input.type === "text";

      input.type = visible ? "password" : "text";
      icon.classList.toggle("fa-eye", !visible);
      icon.classList.toggle("fa-eye-slash", visible);
    });
  });

  registerRole.addEventListener("change", updateRegisterFields);
  updateRegisterFields();

  // --- LÓGICA DE LOGIN (Con redirección corregida) ---
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const submitButton = loginForm.querySelector(".btn-submit");
    const payload = Object.fromEntries(new FormData(loginForm).entries());

    submitButton.disabled = true;
    submitButton.innerHTML =
      'Entrando... <i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.mensaje || "No se pudo iniciar sesión.");
      }

      // Guardar Tokens
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));

      showMessage(
        "Sesión iniciada correctamente. Redirigiendo al dashboard...",
        "success",
      );

      // Redirección Dinámica basada en el ROL
      setTimeout(() => {
        let destino = "/pages/index.html"; // Fallback por defecto

        switch (data.usuario?.rol) {
          case "paciente":
            destino = "/pages/interfazpaciente.html";
            break;
          case "medico":
            destino = "/doctor";
            break;
          case "farmaceutico":
            destino = "/pages/InterfazFarmaceutico.html";
            break;
          case "familiar":
            destino = "/pages/vistafamiliar.html";
            break;
          case "administrador":
            destino = "/pages/index.html";
            break;
        }

        window.location.href = destino;
      }, 900);
    } catch (error) {
      showMessage(
        error.message || "Ocurrió un error al iniciar sesión.",
        "error",
      );
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML =
        'Entrar al dashboard <i class="fa-solid fa-arrow-right"></i>';
    }
  });

  // --- LÓGICA DE REGISTRO ---
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const submitButton = registerForm.querySelector(".btn-submit");
    const payload = Object.fromEntries(new FormData(registerForm).entries());
    const confirmar = document.getElementById("register-confirmar").value;
    const acceptedTerms = document.getElementById("terms").checked;

    // Validaciones del Frontend
    if (!payload.nombre?.trim())
      return showMessage("El nombre es requerido.", "error");
    if (!payload.rol) return showMessage("Debes seleccionar un rol.", "error");
    if (!payload.correo?.trim())
      return showMessage("Debes proporcionar correo.", "error");
    if (!payload.contrasena?.trim())
      return showMessage("La contraseña es requerida.", "error");
    if (payload.contrasena !== confirmar)
      return showMessage("Las contraseñas no coinciden.", "error");
    if (!acceptedTerms)
      return showMessage("Debes aceptar los términos y condiciones.", "error");

    if (
      (payload.rol === "medico" || payload.rol === "farmaceutico") &&
      !payload.cedula_profesional?.trim()
    ) {
      return showMessage("La cédula profesional es requerida.", "error");
    }
    if (payload.rol === "medico" && !payload.especialidad?.trim()) {
      return showMessage("La especialidad es requerida.", "error");
    }
    if (payload.rol === "paciente" && (!payload.edad || !payload.id_medico)) {
      return showMessage(
        "La edad y el médico tratante son requeridos.",
        "error",
      );
    }
    if (payload.rol === "familiar" && !payload.relacion_paciente?.trim()) {
      return showMessage("La relación con el paciente es requerida.", "error");
    }

    submitButton.disabled = true;
    submitButton.innerHTML =
      'Registrando... <i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      const response = await fetch("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.mensaje || "No se pudo registrar la cuenta.");
      }

      showMessage(
        "Cuenta creada correctamente. Ahora ya puedes iniciar sesión.",
        "success",
      );
      registerForm.reset();

      setTimeout(() => {
        setView("login");
      }, 1200);
    } catch (error) {
      showMessage(
        error.message || "Ocurrió un error al registrar la cuenta.",
        "error",
      );
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML =
        'Registrarme <i class="fa-solid fa-arrow-right"></i>';
    }
  });

  // --- LÓGICA DE RECUPERACIÓN ---
  recoverForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const submitButton = recoverForm.querySelector(".btn-submit");
    const payload = Object.fromEntries(new FormData(recoverForm).entries());

    submitButton.disabled = true;
    submitButton.innerHTML =
      'Verificando... <i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      const response = await fetch("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.mensaje || "No se pudo verificar el correo.");
      }

      const extraLink = data.linkRecuperacion
        ? `<br><br><a href="${data.linkRecuperacion}">Abrir enlace de recuperación</a>`
        : "";

      showMessageHtml(`${data.mensaje}${extraLink}`, "success");
    } catch (error) {
      showMessage(
        error.message || "Ocurrió un error al recuperar la cuenta.",
        "error",
      );
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML =
        'Verificar correo <i class="fa-solid fa-paper-plane"></i>';
    }
  });
});
