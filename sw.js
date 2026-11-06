const CACHE = 'caminos-ar-v113';

/* Archivos que van a caché (app shell para offline) */
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js'
];

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
  const url = new URL(e.request.url);
  const isCoreFile = ['/style.css', '/app.js', '/data.js', '/index.html', '/'].some(
    p => url.pathname.endsWith(p)
  );

  if (isCoreFile) {
    /* Estrategia Network-First para archivos core:
       intenta red primero, si falla usa caché */
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    /* Fotos, mapas, íconos: Cache-First (no cambian) */
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).catch(() => {}))
    );
  }
});
