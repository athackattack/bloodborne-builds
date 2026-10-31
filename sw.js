// Network-first shell. CACHE is the version string: bump it when shipped assets change.
const CACHE = "souls-builds-v5-20261031030000";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./atmosphere.css",
  "./app.js",
  "./sections.js",
  "./data/games.json",
  "./data/bloodborne.json",
  "./data/elden-ring.json",
  "./data/demons-souls.json",
  "./data/bloodborne-map.json",
  "./data/elden-ring-map.json",
  "./data/demons-souls-map.json",
  "./data/samples/bloodborne-crafting.json",
  "./data/samples/bloodborne-equipment.json",
  "./data/samples/elden-ring-crafting.json",
  "./data/samples/elden-ring-equipment.json",
  "./data/samples/demons-souls-crafting.json",
  "./data/samples/demons-souls-equipment.json",
  "./manifest.json",
  "./icons/emblem.png",
  "./icons/favicon-32.png",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./noise.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && !url.search) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || (request.mode === "navigate" ? caches.match("./index.html") : undefined))
      )
  );
});
