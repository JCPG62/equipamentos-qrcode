const CACHE_NAME = "qrmanut-static-7.5.0.5";
const STATIC_ASSETS = [
  "./equip_formulario.html",
  "./manifest.webmanifest",
  "./qrmanut-180.png",
  "./qrmanut-192.png",
  "./qrmanut-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith("qrmanut-static-") && key !== CACHE_NAME)
            .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if(request.method !== "GET") return;

  const url = new URL(request.url);

  // Navegação/HTML: rede primeiro para receber correções mais rápido.
  if(request.mode === "navigate" || url.pathname.endsWith("/equip_formulario.html")){
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("./equip_formulario.html", copy));
          return response;
        })
        .catch(() => caches.match("./equip_formulario.html"))
    );
    return;
  }

  // Arquivos estáticos locais: cache primeiro.
  if(url.origin === self.location.origin){
    event.respondWith(
      caches.match(request).then(cached => {
        if(cached) return cached;
        return fetch(request).then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        });
      })
    );
  }
});
