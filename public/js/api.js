const MedAlertApi = (() => {
  function getAccessToken() {
    return localStorage.getItem("accessToken");
  }

  function getRefreshToken() {
    return localStorage.getItem("refreshToken");
  }

  function getUsuario() {
    try {
      return JSON.parse(localStorage.getItem("usuario") || "null");
    } catch (_error) {
      return null;
    }
  }

  async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("No existe refresh token.");
    }

    const response = await fetch("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.mensaje || "No se pudo renovar la sesión.");
    }

    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    return data.accessToken;
  }

  async function apiFetch(url, options = {}) {
    let accessToken = getAccessToken();
    const headers = new Headers(options.headers || {});

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      try {
        accessToken = await refreshAccessToken();
        headers.set("Authorization", `Bearer ${accessToken}`);
        response = await fetch(url, { ...options, headers });
      } catch (_error) {
        clearSession();
        window.location.href = "/pages/index.html";
        throw new Error("Tu sesión expiró.");
      }
    }

    return response;
  }

  async function apiJson(url, options = {}) {
    const response = await apiFetch(url, options);
    const data = await response.json();

    if (!response.ok || data.ok === false) {
      throw new Error(data.mensaje || "Ocurrió un error en la petición.");
    }

    return data;
  }

  async function logout() {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await fetch("/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      clearSession();
      window.location.href = "/pages/index.html";
    }
  }

  function clearSession() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("usuario");
  }

  return {
    apiFetch,
    apiJson,
    clearSession,
    getUsuario,
    logout,
  };
})();
