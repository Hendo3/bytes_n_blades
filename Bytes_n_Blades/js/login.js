/**
 * BYTE & BLADES - ACCESS CONTROL
 * "Identity is the only currency."
 */

// --- PRE-BOOT CLEANUP ---
// Se alguém chegou na tela de login, garantimos que a memória anterior foi apagada.
(function secureBoot() {
  // Se o usuário atualizou a página de login, limpamos tudo para forçar um login limpo
  // MAS, se ele já tem um ID válido e caiu aqui por engano, redirecionamos para home.
  if (localStorage.getItem("cyber_runner_id")) {
    window.location.href = "index.html";
  } else {
    // Limpeza preventiva
    if (window.I18n) I18n.preserveLocaleAndClear(localStorage);
    else localStorage.clear();
    sessionStorage.clear();
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  const tr = (key, fallback) => window.I18n ? I18n.t(key, {}, fallback) : fallback;
  const inputHandle = document.getElementById("runner-handle");
  const btnLogin = document.getElementById("btn-jack-in");
  const form = document.getElementById("login-form");

  const VALID_REGEX = /^[a-zA-Z0-9_-]+$/;

  inputHandle.addEventListener("input", (e) => {
    const value = e.target.value;
    if (value.includes(" ")) {
      e.target.value = value.replace(/\s/g, "");
    }
    validateInput();
  });

  function validateInput() {
    const value = inputHandle.value.trim();
    const isValid = value.length > 0 && VALID_REGEX.test(value);

    if (isValid) {
      btnLogin.disabled = false;
      btnLogin.style.opacity = "1";
      btnLogin.style.cursor = "pointer";
      btnLogin.textContent = tr("login.jack_in", "JACK IN");
    } else {
      btnLogin.disabled = true;
      btnLogin.style.opacity = "0.3";
      btnLogin.style.cursor = "not-allowed";
      btnLogin.textContent =
        value.length > 0 && !VALID_REGEX.test(value)
          ? tr("login.invalid", "INVALID CHARACTERS")
          : tr("login.jack_in", "JACK IN");
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const handle = inputHandle.value.trim();
    if (!handle) return;

    // Login Bem Sucedido
    localStorage.setItem("cyber_runner_id", handle.toUpperCase());

    btnLogin.textContent = tr("login.granted", "ACCESS GRANTED...");
    btnLogin.style.background = "var(--neon-green)";
    btnLogin.style.color = "#000";
    btnLogin.style.borderColor = "var(--neon-green)";
    btnLogin.style.boxShadow = "0 0 20px var(--neon-green)";

    setTimeout(() => {
      window.location.href = "index.html";
    }, 800);
  });

});
