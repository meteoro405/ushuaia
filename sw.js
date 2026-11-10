/* sw.js — Sitios de interés en Ushuaia
   IMPORTANTE: al publicar cambios en el código, subí el número de versión de CACHE
   (v1 -> v2 -> ...) para que los celulares descarguen la versión nueva. */
const CACHE = 'sitios-ushuaia-v2';

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

/* Audioguías (mp3). Los navegadores piden el audio por tramos (cabecera Range) y Safari exige
   respuestas 206, así que no se puede servir un archivo cacheado "a secas":
   - si el mp3 ya está en caché -> se responde el tramo pedido desde el caché (sirve offline);
   - si no está -> se deja pasar a la red y, en segundo plano, se guarda el archivo completo
     para la próxima vez. */
async function audioResponse(e) {
  const req = e.request;
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req.url);              // se busca por URL, ignorando Range
  const range = req.headers.get('range');

  if (cached) {
    if (!range) return cached;
    const buf = await cached.arrayBuffer();
    const total = buf.byteLength;
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (!m) return cached;
    let start, end;
    if (m[1] === '') { start = Math.max(0, total - parseInt(m[2], 10)); end = total - 1; }   // bytes=-N (últimos N)
    else { start = parseInt(m[1], 10); end = m[2] === '' ? total - 1 : Math.min(parseInt(m[2], 10), total - 1); }
    if (start >= total || start > end) {
      return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + total } });
    }
    return new Response(buf.slice(start, end + 1), {
      status: 206, statusText: 'Partial Content',
      headers: {
        'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Length': String(end - start + 1),
        'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
        'Accept-Ranges': 'bytes'
      }
    });
  }

  const net = await fetch(req);
  if (net.ok) e.waitUntil(cache.add(req.url).catch(() => {}));
  return net;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin && /\/audioguia\/audios\//.test(url.pathname)) {
    e.respondWith(audioResponse(e));
    return;
  }

  /* Mismo origen */
  if (url.origin === self.location.origin) {
    const p = url.pathname;
    const isCore = p.endsWith('/') || /\/(index\.html|style\.css|app\.js|data\.js|manifest\.json)$/.test(p);

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
