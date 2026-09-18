/**
 * BYTE & BLADES - SECURITY PROTOCOL (ICE) v2.0
 * "No handle, no access. Leave no trace."
 */

(function () {
  const tr = (key, fallback, params = {}) => window.I18n
    ? I18n.t(key, params, fallback)
    : fallback;
  // 1. Evita loop na tela de login
  if (window.location.pathname.includes("login.html")) return;

  // 2. Verifica Credencial
  const runnerID = localStorage.getItem("cyber_runner_id");

  // 3. Se não tiver ID, executa limpeza e chuta
  if (!runnerID) {
    console.warn(">> UNAUTHORIZED ACCESS DETECTED.");
    zeroOutSystem(); // Garante que tá tudo limpo
    redirectToLogin();
  } else {
    // Runner identificado
    window.addEventListener("DOMContentLoaded", () => {
      displayUserIdentity(runnerID);
      setupLogout();
    });
    window.addEventListener("global-navigation-ready", setupLogout);
  }

  // --- FUNÇÕES DE SEGURANÇA ---

  function zeroOutSystem() {
    console.log(">> EXECUTING MEMORY WIPE...");

    // 1. Limpa LocalStorage (Carrinho, ID)
    if (window.I18n) I18n.preserveLocaleAndClear(localStorage);
    else localStorage.clear();

    // 2. Limpa SessionStorage (Hack status, flags temporárias)
    sessionStorage.clear();

    // 3. Limpa Cookies (A parte chata)
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    console.log(">> SYSTEM ZEROED.");
  }

  function redirectToLogin() {
    const pathLevel = window.location.pathname.includes("/html/")
      ? "../"
      : "./";
    window.location.replace(`${pathLevel}login.html`); // .replace impede o botão "voltar"
  }

  function displayUserIdentity(id) {
    const tagline = document.querySelector(".tagline");
    if (tagline) {
      tagline.innerHTML = `${tr("auth.status", "STATUS")}: <span style="color:var(--neon-green)">${tr("auth.online", "ONLINE")}</span> // ${tr("auth.user", "USER")}: <span style="color:var(--secondary-color)">${id}</span>`;
    }
  }

  function confirmLogout(onConfirm) {
    const title = tr("auth.jack_out_title", "JACK OUT?");
    const message = tr(
      "auth.jack_out_message",
      "Sever connection and wipe local memory?<br>All session data will be lost.",
    );
    const activeModal = window.Modal || globalThis.Modal;

    if (activeModal && typeof activeModal.confirm === "function") {
      activeModal.confirm(title, message, onConfirm);
      return;
    }

    const plainMessage = String(message)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "");
    if (typeof window.confirm === "function" && window.confirm(`${title}\n\n${plainMessage}`)) {
      onConfirm();
    }
  }

  function setupLogout() {
    const navList = document.querySelector(".nav-session-links") || document.querySelector(".nav-links");
    if (navList) {
      if (navList.querySelector(".jack-out-link")) return;
      const logoutLi = document.createElement("li");
      const logoutBtn = document.createElement("a");

      logoutLi.className = "nav-session-action";
      logoutBtn.className = "jack-out-link";
      logoutBtn.textContent = tr("auth.jack_out", "[ JACK OUT ]");
      logoutBtn.href = "#";
      logoutBtn.style.color = "var(--alert-color)";
      logoutBtn.style.borderColor = "var(--alert-color)";
      logoutBtn.style.textShadow = "0 0 5px var(--alert-color)";

      logoutBtn.onclick = (e) => {
        e.preventDefault();
        confirmLogout(() => {
          zeroOutSystem();
          redirectToLogin();
        });
      };

      logoutLi.appendChild(logoutBtn);
      navList.appendChild(logoutLi);
    }
  } 

})();
