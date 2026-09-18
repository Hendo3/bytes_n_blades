/**
 * BYTE & BLADES - PWA REGISTRATION
 * Registers the root-scoped offgrid cache without coupling page controllers.
 */
(function (root) {
  const documentNode = root.document;
  const scriptSource = documentNode?.currentScript?.src || "https://bytes.invalid/js/pwa.js";
  let registrationPromise = null;
  let listenersBound = false;

  function setState(state) {
    if (documentNode?.documentElement) documentNode.documentElement.dataset.pwaState = state;
    root.dispatchEvent?.(new root.CustomEvent("pwa-state", { detail: { state } }));
    return state;
  }

  function available() {
    return Boolean(root.navigator?.serviceWorker && /^https?:$/.test(new URL(scriptSource).protocol));
  }

  function bindNetworkState() {
    if (listenersBound) return;
    listenersBound = true;
    root.addEventListener?.("offline", () => setState("offline"));
    root.addEventListener?.("online", () => setState(root.navigator?.serviceWorker?.controller ? "cached" : "online"));
    root.navigator?.serviceWorker?.addEventListener?.("controllerchange", () => setState("cached"));
  }

  function register() {
    if (registrationPromise) return registrationPromise;
    if (!available()) {
      setState("unsupported");
      return Promise.resolve(null);
    }

    bindNetworkState();
    const workerUrl = new URL("../service-worker.js", scriptSource);
    const scopeUrl = new URL("../", scriptSource);
    setState(root.navigator.onLine === false ? "offline" : "registering");
    registrationPromise = root.navigator.serviceWorker.register(workerUrl.href, {
      scope: scopeUrl.href,
      updateViaCache: "none",
    }).then((registration) => {
      setState(root.navigator.onLine === false ? "offline" : "ready");
      registration.addEventListener?.("updatefound", () => setState("updating"));
      return registration;
    }).catch(() => {
      registrationPromise = null;
      setState("unavailable");
      return null;
    });
    return registrationPromise;
  }

  function boot() {
    return register();
  }

  const api = { setState, available, bindNetworkState, register, boot };
  root.CyberPWA = api;
  if (documentNode) {
    if (documentNode.readyState === "loading") documentNode.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
