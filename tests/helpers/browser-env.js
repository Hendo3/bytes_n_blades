const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const projectRoot = path.resolve(__dirname, "../..");

function installBrowserEnv({
  html = "<!doctype html><html><body></body></html>",
  url = "https://bytes.test/index.html",
  fetchImpl,
  immediateTimers = false,
} = {}) {
  const virtualConsole = new VirtualConsole();
  const jsdomErrors = [];
  virtualConsole.on("jsdomError", (error) => jsdomErrors.push(error));

  const dom = new JSDOM(html, {
    url,
    pretendToBeVisual: true,
    runScripts: "outside-only",
    virtualConsole,
  });

  const saved = new Map();
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    localStorage: dom.window.localStorage,
    sessionStorage: dom.window.sessionStorage,
    Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent,
    Blob: dom.window.Blob,
    HTMLElement: dom.window.HTMLElement,
    HTMLAnchorElement: dom.window.HTMLAnchorElement,
    requestAnimationFrame: (callback) => dom.window.setTimeout(() => callback(Date.now()), 0),
    cancelAnimationFrame: (id) => dom.window.clearTimeout(id),
  };

  for (const [key, value] of Object.entries(globals)) {
    saved.set(key, Object.prototype.hasOwnProperty.call(global, key)
      ? { exists: true, value: global[key] }
      : { exists: false });
    global[key] = value;
  }

  const effectiveFetch = fetchImpl || (async () => {
    throw new Error("Unexpected fetch in browser test");
  });
  saved.set("fetch", Object.prototype.hasOwnProperty.call(global, "fetch")
    ? { exists: true, value: global.fetch }
    : { exists: false });
  global.fetch = effectiveFetch;
  dom.window.fetch = effectiveFetch;

  if (immediateTimers) {
    for (const key of ["setTimeout", "clearTimeout", "setInterval", "clearInterval"]) {
      saved.set(key, Object.prototype.hasOwnProperty.call(global, key)
        ? { exists: true, value: global[key] }
        : { exists: false });
    }
    global.setTimeout = (callback) => {
      callback();
      return 1;
    };
    global.clearTimeout = () => {};
    global.setInterval = () => 1;
    global.clearInterval = () => {};
  }

  function cleanup() {
    dom.window.close();
    for (const [key, state] of saved) {
      if (state.exists) global[key] = state.value;
      else delete global[key];
    }
  }

  return {
    dom,
    window: dom.window,
    document: dom.window.document,
    jsdomErrors,
    cleanup,
  };
}

function requireFresh(relativePath) {
  const absolute = path.join(projectRoot, relativePath);
  delete require.cache[require.resolve(absolute)];
  return require(absolute);
}

function dispatchDOMContentLoaded(document = global.document) {
  document.dispatchEvent(new document.defaultView.Event("DOMContentLoaded", {
    bubbles: true,
  }));
}

function jsonResponse(data, { ok = true, status = ok ? 200 : 500 } = {}) {
  return {
    ok,
    status,
    async json() {
      return structuredClone(data);
    },
  };
}

async function flushPromises(rounds = 4) {
  for (let index = 0; index < rounds; index += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

module.exports = {
  projectRoot,
  installBrowserEnv,
  requireFresh,
  dispatchDOMContentLoaded,
  jsonResponse,
  flushPromises,
};
