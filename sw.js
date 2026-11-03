// Network-first shell. CACHE is the version string: bump it when shipped assets change.
const CACHE = "souls-builds-v16-20261103070000";
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
  "./manifest.json",
  "./icons/emblem.png",
  "./icons/favicon-32.png",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./noise.png"
];
// Crafting and equipment files are large. Install does not download them.
// The page fetches a file when that section opens, and the fetch handler stores it here for offline.
const SECTION = [
  "./data/bloodborne-crafting.json",
  "./data/bloodborne-equipment.json",
  "./data/elden-ring-crafting.json",
  "./data/elden-ring-equipment.json",
  "./data/elden-ring-reforged-crafting.json",
  "./data/elden-ring-reforged-equipment.json",
  "./data/elden-ring-reforged-systems.json",
  "./data/elden-ring-reforged.json",
  "./data/demons-souls-crafting.json",
  "./data/demons-souls-equipment.json",
  "./data/bosses-elden-ring.json",
  "./data/bosses-bloodborne.json",
  "./data/bosses-demons-souls.json",
  "./data/talisman-acquisition.json",
  "./images/items/index.json"
];
const PRECACHE = SHELL.filter((item) => item !== "./").concat(SECTION);

function listed(url) {
  const path = decodeURIComponent(url.pathname);
  return PRECACHE.some((item) => path.endsWith(item.replace(/^\.\//, "")));
}

function viewedMap(url) {
  const path = decodeURIComponent(url.pathname);
  return /\/maps\/[^/]+\/[^/]+$/.test(path);
}

function viewedItem(url) {
  const path = decodeURIComponent(url.pathname);
  return /\/images\/items\/[^/]+\/[^/]+\/[^/]+\.webp$/.test(path);
}

function viewedBoss(url) {
  const path = decodeURIComponent(url.pathname);
  return /\/images\/bosses\/[^/]+\/[^/]+\.webp$/.test(path);
}

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
        if (response.ok && !url.search && (listed(url) || viewedMap(url) || viewedItem(url) || viewedBoss(url) || request.mode === "navigate")) {
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
