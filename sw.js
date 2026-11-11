/* sw.js — Sitios de interés en Ushuaia
   IMPORTANTE: al publicar cambios en el código, subí el número de versión de CACHE
   (v1 -> v2 -> ...) para que los celulares descarguen la versión nueva. */
const CACHE = 'sitios-ushuaia-v5';

/* App shell para que abra sin internet (solo archivos que EXISTEN en el repo) */
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './manifest.json',
  './favicon.png',
  './pwa_icon_192.png'
];

/* Recursos de terceros que conviene tener offline (Leaflet y tipografías) */
const CDN_OK = ['unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* Audioguías (mp3): el service worker NO interviene. Van directo a la red, como en una página común:
     los navegadores piden el audio por tramos (cabecera Range) y un service worker en el medio
     puede romper la reproducción en algunos celulares. Por eso el audio necesita conexión. */
  if (url.origin === self.location.origin && /\/audioguia\/audios\//.test(url.pathname)) return;

  /* Mismo origen */
  if (url.origin === self.location.origin) {
    const p = url.pathname;
    const isCore = p.endsWith('/') || /\.(html|css|js|json)$/.test(p);   // incluye las páginas de audioguia/estaciones/

    if (isCore) {
      /* Network-first: si hay red trae lo último; si no, caché */
      e.respondWith(
        fetch(req)
          .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
          .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
      );
    } else {
      /* Fotos, mapas, íconos: cache-first, y se guardan al verlas por primera vez */
      e.respondWith(
        caches.match(req).then(r => r || fetch(req).then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        }))
      );
    }
    return;
  }

  /* Leaflet y fuentes: cache-first con actualización en segundo plano */
  if (CDN_OK.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(cached => {
        const red = fetch(req).then(res => {
          if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => cached);
        return cached || red;
      })
    );
  }
  /* Todo lo demás (Open-Meteo, mapas de Google, teselas) va directo a la red */
});
