/**
 * BYTE & BLADES - OFFGRID CACHE NODE
 * Atomic application-shell install with resilient navigation and data caching.
 */
const CACHE_PREFIX = "bytes-blades-offgrid";
const CACHE_VERSION = "2026-08-30.1";
const PRECACHE = `${CACHE_PREFIX}-precache-${CACHE_VERSION}`;
const RUNTIME = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;
const OFFLINE_FALLBACK = "./html/404.html";
const NETWORK_TIMEOUT_MS = 3500;
const RUNTIME_LIMIT = 80;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./login.html",
  "./html/404.html",
  "./html/accessories.html",
  "./html/ammo.html",
  "./html/aptr-chips.html",
  "./html/bundles.html",
  "./html/cart.html",
  "./html/cyberdecks.html",
  "./html/cyberwares.html",
  "./html/debug.html",
  "./html/deck-builder.html",
  "./html/drugs-generator.html",
  "./html/drugs.html",
  "./html/mram-chips.html",
  "./html/programs.html",
  "./html/visual-rec-chips.html",
  "./html/weapons.html",
  "./css/styles.css",
  "./assets/fonts/Mokoto Glitch.ttf",
  "./assets/fonts/Mokoto Glitch Mark.ttf",
  "./assets/svg/favicon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./manifest.webmanifest",
  "./manifest.pt-BR.webmanifest",
  "./data/cyberwares.json",
  "./data/cyberwares.pt-BR.json",
  "./data/equipment.json",
  "./data/equipment.pt-BR.json",
  "./data/decks.json",
  "./data/decks.pt-BR.json",
  "./data/programs.json",
  "./data/programs.pt-BR.json",
  "./data/cyberdecks.json",
  "./data/cyberdecks.pt-BR.json",
  "./data/weapons.json",
  "./data/weapons.pt-BR.json",
  "./data/ammo.json",
  "./data/ammo.pt-BR.json",
  "./data/drugs.json",
  "./data/drugs.pt-BR.json",
  "./data/chip-rates.json",
  "./data/chip-rates.pt-BR.json",
  "./data/editorial-sources.json",
  "./js/auth.js",
  "./js/bundles.js",
  "./js/cart.js",
  "./js/chip-rates.js",
  "./js/comparator.js",
  "./js/core-utils.js",
  "./js/debug.js",
  "./js/dialog-a11y.js",
  "./js/drugs-generator.js",
  "./js/editorial-sources.js",
  "./js/global-navigation.js",
  "./js/global-search.js",
  "./js/hack.js",
  "./js/home-dashboard.js",
  "./js/i18n.js",
  "./js/loadouts.js",
  "./js/login.js",
  "./js/modal.js",
  "./js/netrunning.js",
  "./js/permalinks.js",
  "./js/pwa.js",
  "./js/script.js",
  "./js/ui-controls.js",
];

function cacheable(response) {
  return Boolean(response && response.ok && ["basic", "default", ""].includes(response.type || ""));
}

async function trim(cache, limit = RUNTIME_LIMIT) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map((key) => cache.delete(key)));
}

async function store(cacheName, request, response) {
  if (!cacheable(response)) return response;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  if (cacheName === RUNTIME) await trim(cache);
  return response;
}

async function fetchWithTimeout(request, timeout = NETWORK_TIMEOUT_MS) {
  let timer;
  try {
    return await Promise.race([
      fetch(request),
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("NETWORK_TIMEOUT")), timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function navigationResponse(request) {
  try {
    const response = await fetchWithTimeout(request);
    return await store(RUNTIME, request, response);
  } catch {
    return (await caches.match(request, { ignoreSearch: true }))
      || (await caches.match(OFFLINE_FALLBACK))
      || (await caches.match("./index.html"))
      || Response.error();
  }
}

async function assetResponse(request, event) {
  const cached = await caches.match(request, { ignoreSearch: true });
  const refresh = fetch(request)
    .then((response) => store(RUNTIME, request, response))
    .catch(() => null);
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  return (await refresh) || Response.error();
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name.startsWith(CACHE_PREFIX) && ![PRECACHE, RUNTIME].includes(name))
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(request.mode === "navigate"
    ? navigationResponse(request)
    : assetResponse(request, event));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_RUNTIME") event.waitUntil(caches.delete(RUNTIME));
});

self.__BYTE_BLADES_SW__ = {
  CACHE_PREFIX,
  CACHE_VERSION,
  PRECACHE,
  RUNTIME,
  OFFLINE_FALLBACK,
  PRECACHE_URLS,
  cacheable,
  trim,
  store,
  fetchWithTimeout,
  navigationResponse,
  assetResponse,
};
