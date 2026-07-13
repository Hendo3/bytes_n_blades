/**
 * BYTE & BLADES - SECURITY PROTOCOL (ICE) v2.0
 * "No handle, no access. Leave no trace."
 */

(function () {
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
  }

  // --- FUNÇÕES DE SEGURANÇA ---

  function zeroOutSystem() {
    console.log(">> EXECUTING MEMORY WIPE...");

    // 1. Limpa LocalStorage (Carrinho, ID)
    localStorage.clear();

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
      tagline.innerHTML = `STATUS: <span style="color:var(--neon-green)">ONLINE</span> // USER: <span style="color:var(--secondary-color)">${id}</span>`;
    }
  }

  function setupLogout() {
    const navList = document.querySelector(".nav-links");
    if (navList) {
      const logoutLi = document.createElement("li");
      const logoutBtn = document.createElement("a");

      logoutBtn.textContent = "[ JACK OUT ]";
      logoutBtn.href = "#";
      logoutBtn.style.color = "var(--alert-color)";
      logoutBtn.style.borderColor = "var(--alert-color)";
      logoutBtn.style.textShadow = "0 0 5px var(--alert-color)";

      logoutBtn.onclick = (e) => {
        e.preventDefault();
        Modal.confirm(
          "JACK OUT?",
          "Sever connection and wipe local memory?<br>All session data will be lost.",
          () => {
            zeroOutSystem();
            redirectToLogin();
          },
        );
      };

      logoutLi.appendChild(logoutBtn);
      navList.appendChild(logoutLi);
    }
  } 

})();