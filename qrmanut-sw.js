const CACHE_NAME="qrmanut-static-7.6.6.24.12-r12-modalfix";
const STATIC_ASSETS=[
  "./equip_formulario.html",
  "./manifest.webmanifest",
  "./qrmanut-180.png",
  "./qrmanut-192.png",
  "./qrmanut-512.png"
];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>Promise.allSettled(STATIC_ASSETS.map(asset=>cache.add(asset))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys
          .filter(key=>key.startsWith("qrmanut-static-")&&key!==CACHE_NAME)
          .map(key=>caches.delete(key))
      ))
      .then(()=>self.clients.claim())
  );
});

function cacheIfValid_(cache,key,response){
  if(!response||!response.ok||response.type==="opaque")return Promise.resolve(response);
  const copy=response.clone();
  return cache.put(key,copy)
    .then(()=>response)
    .catch(()=>response);
}

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;

  const url=new URL(event.request.url);

  if(event.request.mode==="navigate"||url.pathname.endsWith("/equip_formulario.html")){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          if(!response||!response.ok||response.type==="opaque")return response;
          const copy=response.clone();
          return caches.open(CACHE_NAME)
            .then(cache=>cache.put("./equip_formulario.html",copy))
            .then(()=>response)
            .catch(()=>response);
        })
        .catch(()=>
          caches.match("./equip_formulario.html")
            .then(cached=>cached||Response.error())
        )
    );
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith(
      caches.match(event.request)
        .then(cached=>{
          if(cached)return cached;
          return fetch(event.request)
            .then(response=>
              caches.open(CACHE_NAME)
                .then(cache=>cacheIfValid_(cache,event.request,response))
                .catch(()=>response)
            );
        })
        .catch(()=>
          caches.match(event.request)
            .then(cached=>cached||Response.error())
        )
    );
  }
});
