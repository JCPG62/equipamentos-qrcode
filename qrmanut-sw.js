/*
 * QRManut 7.6.6.25 — Onda 2B / B4
 * Service Worker estável.
 *
 * REGRA DE MANUTENÇÃO:
 * - Pequenas alterações em equip_formulario.html NÃO exigem alterar este arquivo.
 * - Só atualizar CACHE_VERSION quando a lógica do Service Worker, manifest,
 *   nomes de arquivos estáticos ou política offline realmente mudar.
 */

const CACHE_VERSION="7.6.6.25-b4";
const STATIC_CACHE=`qrmanut-static-${CACHE_VERSION}`;
const NAV_CACHE=`qrmanut-navigation-${CACHE_VERSION}`;

const APP_HTML="./equip_formulario.html";

const STATIC_ASSETS=[
  "./manifest.webmanifest",
  "./qrmanut-180.png",
  "./qrmanut-192.png",
  "./qrmanut-512.png"
];

self.addEventListener("install",event=>{
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE)
        .then(cache=>Promise.allSettled(
          STATIC_ASSETS.map(asset=>cache.add(asset))
        )),
      // Mantém uma cópia inicial para uso offline.
      // Mesmo pré-cacheado, o HTML SEMPRE usa network-first nas navegações.
      caches.open(NAV_CACHE)
        .then(cache=>fetch(APP_HTML,{cache:"no-store"})
          .then(response=>{
            if(response&&response.ok&&response.type!=="opaque"){
              return cache.put(APP_HTML,response.clone());
            }
          })
          .catch(()=>null))
    ]).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys
          .filter(key=>
            (key.startsWith("qrmanut-static-")||key.startsWith("qrmanut-navigation-")) &&
            key!==STATIC_CACHE &&
            key!==NAV_CACHE
          )
          .map(key=>caches.delete(key))
      ))
      .then(()=>self.clients.claim())
  );
});

function validResponse_(response){
  return !!response && response.ok && response.type!=="opaque";
}

async function putSafe_(cacheName,key,response){
  if(!validResponse_(response))return response;
  try{
    const cache=await caches.open(cacheName);
    await cache.put(key,response.clone());
  }catch(_e){}
  return response;
}

async function networkFirstNavigation_(request){
  try{
    // cache:"no-store" evita que o cache HTTP do navegador devolva um HTML antigo.
    const response=await fetch(request,{cache:"no-store"});
    if(validResponse_(response)){
      // Guarda sempre como fallback genérico, ignorando ?id=...
      await putSafe_(NAV_CACHE,APP_HTML,response);
    }
    return response;
  }catch(_e){
    const navCache=await caches.open(NAV_CACHE);

    // Primeiro tenta uma cópia equivalente ignorando a query string.
    const cachedRequest=await navCache.match(request,{ignoreSearch:true});
    if(cachedRequest)return cachedRequest;

    const fallback=await navCache.match(APP_HTML);
    if(fallback)return fallback;

    return new Response(
      "<!doctype html><html lang='pt-br'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>QRManut offline</title><body style='font-family:system-ui;padding:24px'><h2>QRManut</h2><p>Sem conexão e nenhuma cópia offline do sistema está disponível neste dispositivo.</p></body></html>",
      {status:503,headers:{"Content-Type":"text/html; charset=utf-8"}}
    );
  }
}

async function networkFirstStatic_(request){
  try{
    const response=await fetch(request,{cache:"no-store"});
    if(validResponse_(response)){
      await putSafe_(STATIC_CACHE,request,response);
    }
    return response;
  }catch(_e){
    const cached=await caches.match(request,{ignoreSearch:true});
    return cached||Response.error();
  }
}

async function staleWhileRevalidate_(request,event){
  const cached=await caches.match(request,{ignoreSearch:true});

  const networkPromise=fetch(request)
    .then(response=>{
      if(validResponse_(response)){
        event.waitUntil(putSafe_(STATIC_CACHE,request,response.clone()));
      }
      return response;
    })
    .catch(()=>null);

  return cached || (await networkPromise) || Response.error();
}

self.addEventListener("fetch",event=>{
  const request=event.request;

  if(request.method!=="GET")return;

  const url=new URL(request.url);

  // Não intercepta APIs externas (ex.: Apps Script).
  if(url.origin!==self.location.origin)return;

  const isNavigation=
    request.mode==="navigate" ||
    url.pathname.endsWith("/equip_formulario.html");

  if(isNavigation){
    event.respondWith(networkFirstNavigation_(request));
    return;
  }

  if(url.pathname.endsWith("/manifest.webmanifest")){
    event.respondWith(networkFirstStatic_(request));
    return;
  }

  if(
    url.pathname.endsWith("/qrmanut-180.png") ||
    url.pathname.endsWith("/qrmanut-192.png") ||
    url.pathname.endsWith("/qrmanut-512.png")
  ){
    event.respondWith(staleWhileRevalidate_(request,event));
    return;
  }

  // Demais GETs do mesmo domínio: rede primeiro, cache como fallback.
  event.respondWith(networkFirstStatic_(request));
});
