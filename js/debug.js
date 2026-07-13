/**
 * BYTE & BLADES - DEBUG CONSOLE
 */

(function () {
  const state = {
    paused: false,
    logs: [],
  };

  const MAX_LOGS = 300;

  document.addEventListener("DOMContentLoaded", () => {
    const ui = {
      output: document.getElementById("debug-output"),
      clear: document.getElementById("dbg-clear"),
      pause: document.getElementById("dbg-pause"),
      exportBtn: document.getElementById("dbg-export"),
      checkCyberwares: document.getElementById("dbg-check-cyberwares"),
      checkEquipment: document.getElementById("dbg-check-equipment"),
      checkWeapons: document.getElementById("dbg-check-weapons"),
      snapshotStorage: document.getElementById("dbg-snapshot-storage"),
      testError: document.getElementById("dbg-test-error"),
    };

    if (!ui.output) return;

    bindConsoleCapture();
    bindErrorCapture();
    bindNetworkHooks();
    bindButtons(ui);

    pushLog("system", "Debug console initialized.");
    pushLog("system", `User agent: ${navigator.userAgent}`);
  });

  function bindButtons(ui) {
    ui.clear?.addEventListener("click", () => {
      state.logs = [];
      ui.output.innerHTML = "";
      pushLog("system", "Console cleared.");
    });

    ui.pause?.addEventListener("click", () => {
      state.paused = !state.paused;
      ui.pause.textContent = state.paused ? "Resume" : "Pause";
      pushLog("system", state.paused ? "Capture paused." : "Capture resumed.");
    });

    ui.exportBtn?.addEventListener("click", () => exportLogs());

    ui.checkCyberwares?.addEventListener("click", () => testFetch("../data/cyberwares.json"));
    ui.checkEquipment?.addEventListener("click", () => testFetch("../data/equipment.json"));
    ui.checkWeapons?.addEventListener("click", () => testFetch("../data/weapons.json"));

    ui.snapshotStorage?.addEventListener("click", () => {
      const snapshot = {
        localStorage: collectStorage(localStorage),
        sessionStorage: collectStorage(sessionStorage),
      };
      pushLog("storage", snapshot);
    });

    ui.testError?.addEventListener("click", () => {
      try {
        throw new Error("Manual debug error");
      } catch (error) {
        console.error(error);
      }
    });
  }

  function bindConsoleCapture() {
    const methods = ["log", "info", "warn", "error"];

    methods.forEach((method) => {
      const original = console[method].bind(console);

      console[method] = (...args) => {
        original(...args);
        pushLog(method, args);
      };
    });
  }

  function bindErrorCapture() {
    window.addEventListener("error", (event) => {
      pushLog("error", {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      pushLog("error", {
        type: "unhandledrejection",
        reason: stringifySafe(event.reason),
      });
    });
  }

  function bindNetworkHooks() {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      const startedAt = performance.now();
      const requestUrl = typeof args[0] === "string" ? args[0] : args[0]?.url;

      try {
        const response = await originalFetch(...args);
        pushLog("network", {
          url: requestUrl || "unknown",
          status: response.status,
          ok: response.ok,
          durationMs: Math.round(performance.now() - startedAt),
        });
        return response;
      } catch (error) {
        pushLog("network", {
          url: requestUrl || "unknown",
          failed: true,
          durationMs: Math.round(performance.now() - startedAt),
          error: error.message,
        });
        throw error;
      }
    };
  }

  async function testFetch(url) {
    const startedAt = performance.now();
    try {
      const res = await fetch(url, { cache: "no-store" });
      const payload = await res.json();
      pushLog("check", {
        file: url,
        status: res.status,
        ok: res.ok,
        keys: Object.keys(payload || {}).length,
        durationMs: Math.round(performance.now() - startedAt),
      });
    } catch (error) {
      pushLog("check", {
        file: url,
        ok: false,
        error: error.message,
        durationMs: Math.round(performance.now() - startedAt),
      });
    }
  }

  function collectStorage(storage) {
    const result = {};
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      result[key] = storage.getItem(key);
    }
    return result;
  }

  function pushLog(level, data) {
    if (state.paused && level !== "system") return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      data,
    };

    state.logs.push(entry);
    if (state.logs.length > MAX_LOGS) state.logs.shift();

    renderLog(entry);
  }

  function renderLog(entry) {
    const output = document.getElementById("debug-output");
    if (!output) return;

    const line = document.createElement("div");
    line.className = `debug-line debug-${entry.level}`;

    const time = formatTime(entry.timestamp);
    const payload = stringifySafe(entry.data);
    line.textContent = `[${time}] [${entry.level.toUpperCase()}] ${payload}`;

    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  function exportLogs() {
    const blob = new Blob([JSON.stringify(state.logs, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `debug-log-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
    pushLog("system", "Logs exported.");
  }

  function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString();
  }

  function stringifySafe(value) {
    if (typeof value === "string") return value;

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
})();
