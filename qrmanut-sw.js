const CACHE_NAME = "qrmanut-static-7.4.5.5";

const STATIC_ASSETS = [
  "./manifest.webmanifest",
  "./qrmanut-180.png",
  "./qrmanut-192.png",
  "./qrmanut-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (request.mode === "navigate") { event.respondWith(fetch(request)); return; }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isStaticAsset = STATIC_ASSETS.some(asset => url.pathname.endsWith(asset.replace("./", "/")));
  if (!isStaticAsset) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
