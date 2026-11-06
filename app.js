/* app.js — De Cuestas, Abras y Quebradas */
'use strict';

/* ── FEATURE FLAGS ───────────────────────────────────────────
   FEATURE_DISTANCIAS: muestra botón FAB verde "📏" en mobile y
   el botón de toolbar en desktop, que abre ¿A cuánto queda?
   dentro de un modal iframe (92vh, header verde con X).
   FEATURE_DONACION: muestra/oculta ⛽ Doná (toolbar + FAB
   naranja en mobile + modal MercadoPago).
   Para alternar: cambiar el valor. Sin otros cambios necesarios. */
const FEATURE_DISTANCIAS = true;
const FEATURE_DONACION   = false;
const FEATURE_CAVOK      = true;
const FEATURE_CONVERSOR  = true;

function initFeatureFlags() {
  // Todos los elementos arrancan con clase hidden-by-flag en el HTML.
  // Quitar la clase activa el elemento. CSS @media controla visibilidad FAB/toolbar.

  if (FEATURE_DISTANCIAS) {
    ['distanciasFab', 'btnDistancias', 'distanciasSep'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden-by-flag');
    });
  }

  if (FEATURE_CAVOK) {
    ['cavokFab', 'btnCavok', 'cavokSep'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden-by-flag');
    });
  }

  if (FEATURE_CONVERSOR) {
    ['conversorFab', 'btnConversor', 'conversorSep'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden-by-flag');
    });
  }

  if (FEATURE_DONACION) {
    ['fuelFab', 'fuelSep'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden-by-flag');
    });
    const btnF = document.querySelector('.fuel-pill');
    if (btnF) btnF.classList.remove('hidden-by-flag');
  }
}

/* ── MODAL ¿A CUÁNTO QUEDA? ─────────────────────────────── */
function abrirDistanciasModal() {
  const modal = document.getElementById('distanciasModal');
  const frame = document.getElementById('distanciasFrame');
  if (!modal || !frame) return;
  // Cargar iframe solo la primera vez
  if (!frame.src || frame.src === window.location.href) {
    frame.src = 'https://meteoro405.github.io/distancias-Argentinas/';
  }
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarDistanciasModal() {
  const modal = document.getElementById('distanciasModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── MODAL CAVOK ─────────────────────────────────────────── */
function abrirCavokModal(icao) {
  const modal = document.getElementById('cavokModal');
  const frame = document.getElementById('cavokFrame');
  if (!modal || !frame) return;
  // Si se pasa un ICAO (integración Nivel 2 futura), precarga ese aeropuerto
  const url = icao
    ? `https://meteoro405.github.io/CAVOK/?icao=${icao}`
    : 'https://meteoro405.github.io/CAVOK/';
  if (frame.src !== url) frame.src = url;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarCavokModal() {
  const modal = document.getElementById('cavokModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── MODAL CONVERSOR DE COMBUSTIBLE ─────────────────────── */
function abrirConversorModal() {
  const modal = document.getElementById('conversorModal');
  const frame = document.getElementById('conversorFrame');
  if (!modal || !frame) return;
  if (!frame.src || frame.src === window.location.href) {
    frame.src = 'https://meteoro405.github.io/consumos/';
  }
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarConversorModal() {
  const modal = document.getElementById('conversorModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

// Cerrar modales con click en overlay (fuera del box)
document.addEventListener('DOMContentLoaded', () => {
  ['distanciasModal', 'cavokModal', 'conversorModal'].forEach(id => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    }
  });
});

// Sincroniza la visibilidad de los FABs de apps hermanas con
// .main.has-selection — se ocultan al abrir el detalle de una ruta
// y reaparecen al volver al listado. Aplica la clase directamente
// a cada FAB (no depende de selectores CSS anidados).
(function initDetailOpenSync() {
  const mainEl = document.querySelector('.main');
  if (!mainEl) {
    document.addEventListener('DOMContentLoaded', initDetailOpenSync);
    return;
  }
  const fabIds = ['distanciasFab', 'cavokFab', 'conversorFab', 'fuelFab'];
  const sync = () => {
    const open = mainEl.classList.contains('has-selection');
    fabIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('detail-open-hide', open);
    });
  };
  sync();
  new MutationObserver(sync).observe(mainEl, { attributes: true, attributeFilter: ['class'] });
})();

let activeTipo    = "TODOS";
let activeProv    = "TODAS";
let activeFilter  = "TODOS";
let searchQuery   = "";
let activeItemEl  = null;
let currentDetail = null;

/* ── STORAGE ─────────────────────────────────────────────── */
function getFavs()  { try { return JSON.parse(localStorage.getItem('favs')  || '{}'); } catch(e){ return {}; } }
function getDones() { try { return JSON.parse(localStorage.getItem('dones') || '{}'); } catch(e){ return {}; } }
function itemKey(d) { return d.tipo + '|' + d.nombre + '|' + d.prov; }

function toggleFav(d) {
  const favs = getFavs(), k = itemKey(d);
  favs[k] ? delete favs[k] : (favs[k] = true);
  localStorage.setItem('favs', JSON.stringify(favs));
  renderList(); renderDetail(d);
}
function toggleDone(d) {
  const dones = getDones(), k = itemKey(d);
  dones[k] ? delete dones[k] : (dones[k] = true);
  localStorage.setItem('dones', JSON.stringify(dones));
  renderList(); renderDetail(d);
}

/* ── PANEL PASO FRONTERIZO ───────────────────────────────── */
function openPfPanel(url) {
  let panel = document.getElementById('pf-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'pf-panel';
    panel.innerHTML =
      '<div class="pf-panel-overlay" onclick="closePfPanel()"></div>' +
      '<div class="pf-panel-box">' +
        '<div class="pf-panel-header">' +
          '<span class="pf-panel-title">Estado del Paso</span>' +
          '<button class="pf-panel-close" onclick="closePfPanel()">✕</button>' +
        '</div>' +
        '<iframe id="pf-panel-frame" class="pf-panel-frame" src="" loading="lazy"></iframe>' +
      '</div>';
    document.body.appendChild(panel);
  }
  document.getElementById('pf-panel-frame').src = url;
  panel.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closePfPanel() {
  const panel = document.getElementById('pf-panel');
  if (panel) {
    panel.classList.remove('open');
    document.getElementById('pf-panel-frame').src = '';
    document.body.style.overflow = '';
  }
}

/* ── SIGUIENTE ÍTEM ─────────────────────────────────────── */
function goNextItem() {
  const items = Array.from(document.querySelectorAll('#sideList .route-item'));
  if (!items.length || !activeItemEl) return;
  const idx = items.indexOf(activeItemEl);
  const nextEl = items[(idx + 1) % items.length];
  if (nextEl) nextEl.click();
}

function goPrevItem() {
  const items = Array.from(document.querySelectorAll('#sideList .route-item'));
  if (!items.length || !activeItemEl) return;
  const idx = items.indexOf(activeItemEl);
  const prevEl = items[(idx - 1 + items.length) % items.length];
  if (prevEl) prevEl.click();
}

/* ── COMPARTIR ───────────────────────────────────────────── */
function shareRuta(d) {
  // Guardar en localStorage que esta ruta fue compartida
  const k = itemKey(d);
  localStorage.setItem('shared_' + k, '1');

  // Generar slug para la URL
  const slug = (d.tipo + '_' + d.nombre).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  const base = window.location.href.split('?')[0].split('#')[0];
  const url  = `${base}?ruta=${encodeURIComponent(slug)}`;

  const tipo = d.tipo === 'RUTA ESCÉNICA' ? 'Ruta Escénica' : d.tipo.charAt(0) + d.tipo.slice(1).toLowerCase();
  const text = `${tipo} ${d.nombre} — ${d.prov}${d.alt ? ', ' + d.alt.toLocaleString('es-AR') + ' m' : ''}`;
  const full = `${text}\n${url}`;

  // WhatsApp siempre como primera opción en mobile
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    // Abrir WhatsApp directamente con el texto pre-cargado
    const waUrl = `https://wa.me/?text=${encodeURIComponent(full)}`;
    // Después de abrir WhatsApp, también ofrecer otras opciones via Web Share
    window.open(waUrl, '_blank');
    // Guardar y refrescar UI
    renderList(); renderDetail(d);
    return;
  }

  // Desktop: Web Share API o clipboard
  if (navigator.share) {
    navigator.share({ title: text, text: full, url })
      .then(() => { renderList(); renderDetail(d); })
      .catch(() => {});
  } else {
    navigator.clipboard.writeText(full).then(() => {
      showToast('¡Link copiado al portapapeles!');
      renderList(); renderDetail(d);
    }).catch(() => showToast('No se pudo copiar'));
  }
}

function showToast(msg) {
  let t = document.getElementById('share-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'share-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  // Quitar clase primero para reiniciar la transición si ya estaba visible
  t.classList.remove('visible');
  // Forzar reflow para que la transición se dispare desde cero
  void t.offsetWidth;
  t.classList.add('visible');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('visible'), 2800);
}

/* ── TTS ──────────────────────────────────────────────────── */
let isSpeaking = false;
function speakObs(text, btnEl) {
  if (!window.speechSynthesis) return;
  if (isSpeaking) {
    window.speechSynthesis.cancel(); isSpeaking = false;
    document.querySelectorAll('.tts-btn').forEach(b => b.classList.remove('tts-playing'));
    return;
  }
  function doSpeak() {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'es-AR'; utt.rate = 0.88;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v=>v.lang==='es-AR') || voices.find(v=>v.lang==='es-ES') || voices.find(v=>v.lang.startsWith('es'));
    if (v) utt.voice = v;
    utt.onstart = () => { isSpeaking = true; btnEl && btnEl.classList.add('tts-playing'); };
    utt.onend = utt.onerror = () => { isSpeaking = false; document.querySelectorAll('.tts-btn').forEach(b=>b.classList.remove('tts-playing')); };
    window.speechSynthesis.speak(utt);
  }
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) doSpeak();
  else { window.speechSynthesis.onvoiceschanged = ()=>{ window.speechSynthesis.onvoiceschanged=null; doSpeak(); }; setTimeout(doSpeak, 400); }
}

/* ── SEARCH ─────────────────────────────────────────────── */
const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  searchClear.classList.toggle("visible", searchQuery.length > 0);
  activeProv = "TODAS";
  // Si hay un detalle abierto y el usuario empieza a buscar,
  // volver al listado para que los resultados sean visibles (crítico en mobile)
  if (searchQuery.length > 0 && activeItemEl) {
    if (isSpeaking) { window.speechSynthesis.cancel(); isSpeaking = false; }
    activeItemEl.classList.remove("active");
    activeItemEl = null;
    currentDetail = null;
    document.querySelector(".sidebar").style.display = "";
    document.querySelector(".main").classList.remove("has-selection");
    document.getElementById("detail").innerHTML = emptyState();
  }
  renderList();
});
searchClear.addEventListener("click", () => {
  searchInput.value = ""; searchQuery = "";
  searchClear.classList.remove("visible");
  searchInput.focus(); renderList();
});

/* ── MAPS MODAL ──────────────────────────────────────────── */
function openMaps(nombre, prov, tipo, mapSrc) {
  // Sistema original iframe+modal — funciona con las URLs embed de Google Maps
  // que ya están en mapSrc (rutas) y aeroUbic (aeropuertos)
  const src = mapSrc ||
    "https://maps.google.com/maps?q=" +
    encodeURIComponent((tipo==="RUTA ESCÉNICA"?"Ruta Escénica ":tipo+" ")+nombre+" "+prov+" Argentina") +
    "&output=embed&hl=es";
  document.getElementById("mapsFrame").src = src;
  document.getElementById("mapsTitle").textContent = (tipo ? tipo+" " : "") + nombre + (prov ? " — "+prov : "");
  document.getElementById("mapsModal").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeMaps(e) { if (e.target===document.getElementById("mapsModal")) closeMapsBtn(); }
function closeMapsBtn() {
  document.getElementById("mapsModal").classList.remove("open");
  document.getElementById("mapsFrame").src = "";
  document.body.style.overflow = "";
}
document.addEventListener("keydown", e => { if (e.key==="Escape") closeMapsBtn(); });

/* ── FILTERING ───────────────────────────────────────────── */
function getFiltered() {
  const favs = getFavs(), dones = getDones();
  return DATA.filter(d => {
    if (d.hidden) return false;
    const matchTipo = searchQuery ? true : (activeTipo==="TODOS" || d.tipo===activeTipo);
    let matchSearch = true;
    if (searchQuery) {
      const hay = [d.nombre, d.prov, d.ruta, d.obs, d.tipo, d.dif, d.sup, d.epoca||'', d.prec||'']
        .join(" ").toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
      const q = searchQuery.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
      matchSearch = q.split(/\s+/).every(tok => hay.includes(tok));
    }
    const k = itemKey(d);
    const matchFilter = activeFilter==="TODOS" ? true
      : activeFilter==="FAVORITOS" ? !!favs[k]
      : !!dones[k];
    return matchTipo && matchSearch && matchFilter;
  }).sort((a,b) => {
    const TIPO_ORDER = {"RUTA ESCÉNICA":0,"QUEBRADA":1,"CUESTA":2,"ABRA":3};
    const showingAll = activeTipo==="TODOS" && !searchQuery && activeFilter==="TODOS";
    if (showingAll) {
      const ta = TIPO_ORDER[a.tipo]??9, tb = TIPO_ORDER[b.tipo]??9;
      if (ta !== tb) return ta - tb;
    }
    return a.nombre.localeCompare(b.nombre,'es');
  });
}

function filterTipo(t, btn) {
  activeTipo = t; activeItemEl = null;
  searchInput.value = ""; searchQuery = "";
  searchClear.classList.remove("visible");
  // Limpiar activos en fila 1 y resetear botón Otras
  document.querySelectorAll("#tipoSection .pill").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".otras-item").forEach(b=>b.classList.remove("active"));
  const otrasBtn = document.getElementById("otrasBtn");
  if (otrasBtn) { otrasBtn.textContent = "Otras ▾"; otrasBtn.classList.remove("active"); }
  if (btn) btn.classList.add("active");
  // Restaurar sidebar en mobile si estaba oculta
  document.querySelector(".sidebar").style.display = "";
  document.querySelector(".main").classList.remove("has-selection");
  document.getElementById("detail").innerHTML = emptyState();
  renderList();
}

function toggleOtras(e) {
  e.stopPropagation();
  const menu = document.getElementById("otrasMenu");
  menu.classList.toggle("open");
  // Cerrar al hacer click fuera
  if (menu.classList.contains("open")) {
    setTimeout(() => {
      document.addEventListener("click", closeOtras, { once: true });
    }, 10);
  }
}

function closeOtras() {
  document.getElementById("otrasMenu").classList.remove("open");
}

function selectOtras(tipo, itemEl) {
  // Marcar el item del menú
  document.querySelectorAll(".otras-item").forEach(b=>b.classList.remove("active"));
  itemEl.classList.add("active");
  // Marcar el botón Otras como activo y mostrar qué tipo está seleccionado
  const btn = document.getElementById("otrasBtn");
  const labels = {ABRA:"Abras",CUESTA:"Cuestas",QUEBRADA:"Quebradas"};
  btn.textContent = (labels[tipo]||"Otras") + " ▾";
  btn.classList.add("active");
  // Desactivar el pill de Rutas Escénicas
  document.getElementById("tipo-RUTA").classList.remove("active");
  closeOtras();
  filterTipo(tipo, null);
}

function filterSpecial(f, btn) {
  // Toggle: si ya está activo, volver a TODOS
  if (activeFilter === f) {
    activeFilter = "TODOS";
    document.querySelectorAll(".filter-special").forEach(b=>b.classList.remove("active"));
  } else {
    activeFilter = f;
    document.querySelectorAll(".filter-special").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
  }
  // Volver siempre al listado al cambiar filtro
  searchInput.value = ""; searchQuery = "";
  searchClear.classList.remove("visible");
  document.querySelector(".sidebar").style.display = "";
  document.querySelector(".main").classList.remove("has-selection");
  activeItemEl = null;
  currentDetail = null;
  document.getElementById("detail").innerHTML = emptyState();
  renderList();
}

/* ── RANDOM ──────────────────────────────────────────────── */
function showRandom() {
  searchInput.value = ""; searchQuery = "";
  searchClear.classList.remove("visible");
  // Resetear filtros de tipo para random de todo
  activeTipo = "TODOS";
  document.querySelectorAll("#tipoSection .pill").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".otras-item").forEach(b=>b.classList.remove("active"));
  const otrasBtn = document.getElementById("otrasBtn");
  if (otrasBtn) { otrasBtn.textContent = "Otras ▾"; otrasBtn.classList.remove("active"); }

  const filtered = getFiltered();
  if (!filtered.length) return;
  const d = filtered[Math.floor(Math.random() * filtered.length)];

  renderList();
  const list = document.getElementById("sideList");
  const allItems = list.querySelectorAll(".route-item");
  let found = null;
  getFiltered().forEach((fd, idx) => {
    if (fd.nombre === d.nombre && fd.prov === d.prov) found = allItems[idx];
  });
  if (found) {
    if (activeItemEl) activeItemEl.classList.remove("active");
    found.classList.add("active");
    activeItemEl = found;
    found.scrollIntoView({ behavior: "smooth", block: "nearest" });
    document.getElementById("detail").scrollTop = 0;
  }
  // En mobile, mostrar el detail directamente igual que al hacer click en un item
  document.querySelector(".main").classList.add("has-selection");
  if (window.innerWidth <= 680) {
    document.querySelector(".sidebar").style.display = "none";
  }
  renderDetail(d);
  history.pushState({ itemIndex: DATA.indexOf(d) }, "");
}

/* ── INCENDIOS NASA FIRMS ────────────────────────────────── */
async function loadFirms(d, lat, lng) {
  const MAP_KEY  = '9f1c06fdf864e8e9686d2a372bc95313';
  const today    = new Date().toISOString().slice(0,10);
  const blockId  = 'firms_' + d.nombre.replace(/[^a-z0-9]/gi,'_');
  const cacheKey = 'firms_' + lat.toFixed(2) + '_' + lng.toFixed(2) + '_' + today;

  let focos = null;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) focos = JSON.parse(cached);
  } catch(e) {}

  if (focos === null) {
    try {
      // Bounding box de ~100km alrededor del punto (1° lat ≈ 111km)
      const delta = 0.9;
      const bbox  = `${(lng-delta).toFixed(4)},${(lat-delta).toFixed(4)},${(lng+delta).toFixed(4)},${(lat+delta).toFixed(4)}`;
      const url   = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${MAP_KEY}/VIIRS_SNPP_NRT/${bbox}/3`;
      const res   = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text  = await res.text();

      // Parsear CSV — primera línea es encabezado
      const lines = text.trim().split('\n');
      if (lines.length <= 1) {
        focos = [];
      } else {
        const headers = lines[0].split(',');
        const latIdx  = headers.indexOf('latitude');
        const lngIdx  = headers.indexOf('longitude');
        const confIdx = headers.indexOf('confidence');
        const dateIdx = headers.indexOf('acq_date');
        const timeIdx = headers.indexOf('acq_time');
        const frpIdx  = headers.indexOf('frp');

        focos = lines.slice(1).filter(l => l.trim()).map(line => {
          const cols = line.split(',');
          return {
            lat:  parseFloat(cols[latIdx]),
            lng:  parseFloat(cols[lngIdx]),
            conf: cols[confIdx] || 'n',
            date: cols[dateIdx] || '',
            time: cols[timeIdx] || '',
            frp:  parseFloat(cols[frpIdx]) || 0,
          };
        });
      }
      try { sessionStorage.setItem(cacheKey, JSON.stringify(focos)); } catch(e) {}
    } catch(e) {
      const el = document.getElementById(blockId);
      if (el) el.style.display = 'none';
      return;
    }
  }

  const el = document.getElementById(blockId);
  if (!el) return;

  if (focos.length === 0) {
    // Sin focos — bloque verde tranquilizador
    el.innerHTML =
      '<div class="sec-title firms-title">🔥 Actividad ígnea cercana</div>' +
      '<div class="firms-ok">' +
        '<span class="firms-ok-icon">✅</span>' +
        '<span class="firms-ok-txt">Sin focos detectados en los últimos 3 días en un radio de ~100 km</span>' +
      '</div>' +
      '<p class="firms-credit"><a href="https://firms.nasa.gov" target="_blank" rel="noopener">NASA FIRMS</a> · VIIRS · Puede incluir quemas agrícolas</p>';
    return;
  }

  // Hay focos — clasificar por confianza y calcular más reciente
  const altaConf  = focos.filter(f => f.conf === 'h' || f.conf === 'high');
  const mediaConf = focos.filter(f => f.conf === 'n' || f.conf === 'nominal');

  // Determinar el más reciente
  const sorted = [...focos].sort((a,b) => {
    const da = a.date + a.time.padStart(4,'0');
    const db = b.date + b.time.padStart(4,'0');
    return db.localeCompare(da);
  });
  const ultimo = sorted[0];

  // Formatear hora del último
  function fmtAcq(f) {
    if (!f.date) return '';
    const t = f.time.padStart(4,'0');
    const h = t.slice(0,2), m = t.slice(2,4);
    const parts = f.date.split('-');
    return `${parts[2]}/${parts[1]} ${h}:${m} UTC`;
  }

  // Nivel de alerta
  let nivel, color, emoji;
  if (altaConf.length >= 3 || (altaConf.length >= 1 && ultimo.frp > 50)) {
    nivel = 'ALERTA'; color = 'red'; emoji = '🔴';
  } else if (altaConf.length >= 1 || focos.length >= 5) {
    nivel = 'PRECAUCIÓN'; color = 'orange'; emoji = '🟠';
  } else {
    nivel = 'BAJA ACTIVIDAD'; color = 'yellow'; emoji = '🟡';
  }

  el.innerHTML =
    '<div class="sec-title firms-title">🔥 Actividad ígnea cercana</div>' +
    `<div class="firms-alert firms-${color}">` +
      `<div class="firms-nivel">${emoji} ${nivel}</div>` +
      `<div class="firms-stats">` +
        `<span><strong>${focos.length}</strong> foco${focos.length>1?'s':''} detectado${focos.length>1?'s':''}</span>` +
        (altaConf.length ? `<span><strong>${altaConf.length}</strong> conf. alta</span>` : '') +
        `<span>Último: ${fmtAcq(ultimo)}</span>` +
      `</div>` +
      `<a class="firms-link" href="https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@${lng},${lat},9z" target="_blank" rel="noopener">` +
        `Ver en mapa NASA →` +
      `</a>` +
    `</div>` +
    '<p class="firms-credit"><a href="https://firms.nasa.gov" target="_blank" rel="noopener">NASA FIRMS</a> · VIIRS · ~100 km · Incluye quemas agrícolas</p>';
}

/* ── SISMOS USGS ────────────────────────────────────────── */
async function loadSismos(d, lat, lng) {
  const blockId  = 'sismo_' + d.nombre.replace(/[^a-z0-9]/gi,'_');
  const today    = new Date().toISOString().slice(0,10);
  const cacheKey = 'sismo_' + lat.toFixed(2) + '_' + lng.toFixed(2) + '_' + today;

  let sismos = null;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) sismos = JSON.parse(cached);
  } catch(e) {}

  if (sismos === null) {
    try {
      // Últimos 30 días, radio 200km, magnitud >= 2.5
      const end   = new Date();
      const start = new Date(end - 30 * 24 * 3600 * 1000);
      const fmt   = d => d.toISOString().slice(0,10);
      const url   = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson' +
                    '&starttime=' + fmt(start) +
                    '&endtime='   + fmt(end) +
                    '&latitude='  + lat.toFixed(4) +
                    '&longitude=' + lng.toFixed(4) +
                    '&maxradius=2' +   // 2 grados ≈ ~220 km
                    '&minmagnitude=2.5' +
                    '&orderby=magnitude' +
                    '&limit=10';
      const res  = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      sismos = json.features || [];
      try { sessionStorage.setItem(cacheKey, JSON.stringify(sismos)); } catch(e) {}
    } catch(e) {
      const el = document.getElementById(blockId);
      if (el) el.style.display = 'none';
      return;
    }
  }

  const el = document.getElementById(blockId);
  if (!el) return;

  if (sismos.length === 0) {
    el.innerHTML =
      '<div class="sec-title">🌎 Actividad sísmica</div>' +
      '<div class="sismo-ok">' +
        '<span class="sismo-ok-icon">✅</span>' +
        '<span class="sismo-ok-txt">Sin sismos M≥2.5 en los últimos 30 días en ~200 km</span>' +
      '</div>' +
      '<p class="sismo-credit"><a href="https://earthquake.usgs.gov" target="_blank" rel="noopener">USGS</a></p>';
    return;
  }

  // El más significativo (ya viene ordenado por magnitud)
  const top = sismos[0].properties;
  const mag = top.mag;

  // Fecha legible
  function fmtDate(ms) {
    const d = new Date(ms);
    return d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric',
      timeZone:'America/Argentina/Buenos_Aires' }) + ' ' +
      d.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit',
      timeZone:'America/Argentina/Buenos_Aires' });
  }

  // Nivel según magnitud
  let color, emoji, nivel;
  if (mag >= 6.0)      { color='red';    emoji='🔴'; nivel='FUERTE'; }
  else if (mag >= 4.5) { color='orange'; emoji='🟠'; nivel='MODERADO'; }
  else if (mag >= 3.0) { color='yellow'; emoji='🟡'; nivel='LEVE'; }
  else                 { color='green';  emoji='🟢'; nivel='MUY LEVE'; }

  // Lugar del epicentro (traducción básica)
  const lugar = (top.place||'')
    .replace('km NW of','km NO de').replace('km NE of','km NE de')
    .replace('km SW of','km SO de').replace('km SE of','km SE de')
    .replace('km N of','km N de').replace('km S of','km S de')
    .replace('km E of','km E de').replace('km W of','km O de')
    .replace('km WNW of','km ONO de').replace('km ENE of','km ENE de')
    .replace('km SSE of','km SSE de').replace('km SSW of','km SSO de')
    .replace('km NNE of','km NNE de').replace('km NNW of','km NNO de');

  // Profundidad
  const prof = sismos[0].geometry.coordinates[2];

  el.innerHTML =
    '<div class="sec-title">🌎 Actividad sísmica reciente</div>' +
    `<div class="sismo-alert sismo-${color}">` +
      `<div class="sismo-mag-row">` +
        `<div class="sismo-mag">${emoji} M ${mag.toFixed(1)}</div>` +
        `<div class="sismo-nivel">${nivel}</div>` +
      `</div>` +
      (lugar ? `<div class="sismo-lugar">${lugar}</div>` : '') +
      `<div class="sismo-meta">` +
        `<span>📅 ${fmtDate(top.time)}</span>` +
        (prof ? `<span>⬇ Prof. ${Math.round(prof)} km</span>` : '') +
        (sismos.length > 1 ? `<span>+${sismos.length-1} más</span>` : '') +
      `</div>` +
      `<a class="sismo-link" href="${top.url}" target="_blank" rel="noopener">Ver en USGS →</a>` +
    `</div>` +
    '<p class="sismo-credit"><a href="https://earthquake.usgs.gov" target="_blank" rel="noopener">USGS Earthquake Hazards</a> · Últimos 30 días · Radio ~200 km</p>';
}

/* ── CONDICIONES MARINAS (Open-Meteo Marine) ─────────────── */
async function loadMar(d, lat, lng) {
  // Usar coords marítimas específicas si existen (para rutas cuyo wazeSrc
  // apunta a tierra firme o canal interior en vez del mar abierto)
  const mLat = (d.marLat != null) ? d.marLat : lat;
  const mLng = (d.marLng != null) ? d.marLng : lng;
  const blockId  = 'mar_' + d.nombre.replace(/[^a-z0-9]/gi,'_');
  const today    = new Date().toISOString().slice(0,10);
  const cacheKey = 'mar_' + mLat.toFixed(2) + '_' + mLng.toFixed(2) + '_' + today;

  let marData = null;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) marData = JSON.parse(cached);
  } catch(e) {}

  if (marData === null) {
    try {
      // Open-Meteo Marine — gratuita, sin key, CORS OK desde browser
      const url = 'https://marine-api.open-meteo.com/v1/marine' +
                  '?latitude='  + mLat.toFixed(4) +
                  '&longitude=' + mLng.toFixed(4) +
                  '&hourly=wave_height,wave_period,wind_wave_height,swell_wave_height' +
                  '&daily=wave_height_max' +
                  '&timezone=America%2FArgentina%2FBuenos_Aires' +
                  '&forecast_days=2';

      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();

      // Encontrar el índice de la hora actual en el array hourly
      const nowH  = new Date().getHours();
      const times = (json.hourly && json.hourly.time) ? json.hourly.time : [];
      let idx = 0;
      for (let i = 0; i < times.length; i++) {
        if (times[i].startsWith(today) && parseInt(times[i].slice(11,13)) <= nowH) idx = i;
      }

      const h   = json.hourly || {};
      const dly = json.daily  || {};
      marData = {
        waveH:  h.wave_height        ? h.wave_height[idx]        : null,
        waveP:  h.wave_period        ? h.wave_period[idx]        : null,
        windW:  h.wind_wave_height   ? h.wind_wave_height[idx]   : null,
        swellW: h.swell_wave_height  ? h.swell_wave_height[idx]  : null,
        maxHoy: dly.wave_height_max  ? dly.wave_height_max[0]    : null,
        maxMan: (dly.wave_height_max && dly.wave_height_max[1] != null)
                  ? dly.wave_height_max[1] : null,
      };
      try { sessionStorage.setItem(cacheKey, JSON.stringify(marData)); } catch(e) {}
    } catch(e) {
      const el = document.getElementById(blockId);
      if (el) el.style.display = 'none';
      return;
    }
  }

  const el = document.getElementById(blockId);
  if (!el) return;

  // Sin datos válidos → ocultar silenciosamente
  if (marData.waveH === null && marData.maxHoy === null) {
    el.style.display = 'none';
    return;
  }

  // Nivel según altura de ola actual (o máxima del día si no hay actual)
  const hRef = marData.waveH !== null ? marData.waveH : marData.maxHoy;
  let nivel, color, emoji;
  if      (hRef === null) { nivel = '—';        color = 'calm'; emoji = '🟢'; }
  else if (hRef < 0.5)    { nivel = 'CALMO';    color = 'calm'; emoji = '🟢'; }
  else if (hRef < 1.5)    { nivel = 'LEVE';     color = 'leve'; emoji = '🟡'; }
  else if (hRef < 3.0)    { nivel = 'MODERADO'; color = 'mod';  emoji = '🟠'; }
  else                    { nivel = 'ALTO';      color = 'alto'; emoji = '🔴'; }

  function fmt1(v) { return (v !== null && v !== undefined) ? v.toFixed(1) + ' m' : '—'; }
  function fmt0(v) { return (v !== null && v !== undefined) ? Math.round(v) + ' s'  : '—'; }

  // Reutilizamos las clases .mar-fila como filas de datos (tipo=etiqueta, hora=valor)
  const filas = [
    marData.waveH  !== null ? ['plea', '〜', 'Oleaje actual',  fmt1(marData.waveH)]  : null,
    marData.waveP  !== null ? ['plea', '↔', 'Período',        fmt0(marData.waveP)]  : null,
    marData.swellW !== null ? ['plea', '↗', 'Swell',          fmt1(marData.swellW)] : null,
    marData.windW  !== null ? ['baja', '💨', 'Ola de viento', fmt1(marData.windW)]  : null,
    marData.maxHoy !== null ? ['baja', '▲', 'Máx. hoy',      fmt1(marData.maxHoy)] : null,
    marData.maxMan !== null ? ['baja', '▲', 'Máx. mañana',   fmt1(marData.maxMan)] : null,
  ].filter(Boolean).map(([cls, icon, lbl, val]) =>
    `<div class="mar-fila mar-fila-${cls}">` +
      `<span class="mar-fila-icon">${icon}</span>` +
      `<span class="mar-fila-tipo">${lbl}</span>` +
      `<span class="mar-fila-hora"></span>` +
      `<span class="mar-fila-alt">${val}</span>` +
    `</div>`
  ).join('');

  el.innerHTML =
    '<div class="sec-title mar-title">🌊 Condiciones marinas</div>' +
    `<div class="mar-nivel-badge mar-nivel-${color}">${emoji} ${nivel}` +
      (marData.waveH !== null ? ` · ${fmt1(marData.waveH)}` : '') +
    `</div>` +
    '<div class="mar-tabla">' + filas + '</div>' +
    '<p class="mar-credit">' +
      '<a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo Marine</a>' +
      ' · ERA5 · Pronóstico horario' +
    '</p>';
}


/* ── METAR (CheckWX API — CORS habilitado) ──────────────── */
async function loadMetar(d) {
  const CHECKWX_KEY = '27d70fc182ef4d169f9f202a8762a17b';
  const icao    = d.aeroIcao;
  const blockId = 'metar_' + icao;
  const now     = new Date();
  const hourKey = now.toISOString().slice(0,13);   // caché por hora
  const cacheKey = 'metar_' + icao + '_' + hourKey;

  let m = null;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) m = JSON.parse(cached);
  } catch(e) {}

  if (m === null) {
    try {
      const url = 'https://api.checkwx.com/v2/metar/' + icao + '/decoded';
      const res = await fetch(url, { headers: { 'X-API-Key': CHECKWX_KEY } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (!json.data || json.data.length === 0) throw new Error('sin datos');
      m = json.data[0];
      try { sessionStorage.setItem(cacheKey, JSON.stringify(m)); } catch(e) {}
    } catch(e) {
      const el = document.getElementById(blockId);
      if (el) el.style.display = 'none';
      return;
    }
  }

  const el = document.getElementById(blockId);
  if (!el) return;

  // ── Semáforo flight_category ────────────────────────────
  const catCfg = {
    'VFR':  { emoji:'🟢', label:'VFR',  desc:'Condiciones buenas',    cls:'metar-vfr'  },
    'MVFR': { emoji:'🟡', label:'MVFR', desc:'Condiciones marginales',cls:'metar-mvfr' },
    'IFR':  { emoji:'🔴', label:'IFR',  desc:'Condiciones malas',     cls:'metar-ifr'  },
    'LIFR': { emoji:'🔴', label:'LIFR', desc:'Condiciones muy malas', cls:'metar-lifr' },
  };
  const fc  = m.flight_category || '';
  const cat = catCfg[fc] || { emoji:'⚪', label: fc||'—', desc:'Sin clasificación', cls:'metar-nd' };

  // ── Viento ───────────────────────────────────────────────
  // CheckWX decoded: m.wind.degrees, m.wind.speed_kts, m.wind.gust_kts
  function wdirToCard(deg) {
    if (deg == null) return '—';
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
    return dirs[Math.round(deg / 22.5) % 16];
  }
  let wStr = '—';
  if (m.wind) {
    const dir  = m.wind.degrees != null ? wdirToCard(m.wind.degrees) : (m.wind.direction || '—');
    const spd  = m.wind.speed_kts != null ? Math.round(m.wind.speed_kts * 1.852) + ' km/h' : '—';
    const gust = m.wind.gust_kts  != null ? ' (ráfagas ' + Math.round(m.wind.gust_kts * 1.852) + ')' : '';
    wStr = dir + ' ' + spd + gust;
  }

  // ── Visibilidad ──────────────────────────────────────────
  // CheckWX decoded: m.visibility.miles o m.visibility.meters
  let visStr = '—';
  if (m.visibility) {
    if (m.visibility.meters != null) {
      visStr = (m.visibility.meters >= 9999) ? '>10 km' : (m.visibility.meters / 1000).toFixed(1) + ' km';
    } else if (m.visibility.miles != null) {
      visStr = (m.visibility.miles * 1.609).toFixed(1) + ' km';
    }
  }

  // ── Nubes ────────────────────────────────────────────────
  // CheckWX decoded: m.clouds array con cover, base_feet_agl, text
  const coverSP = { FEW:'Pocas', SCT:'Dispersas', BKN:'Parciales', OVC:'Cubierto',
                    CLR:'Despejado', SKC:'Despejado', NSC:'Sin nubes sig.', NCD:'Despejado', CAVOK:'CAVOK' };
  let nubesStr = '—';
  if (m.clouds && m.clouds.length > 0) {
    nubesStr = m.clouds
      .map(c => (coverSP[c.code] || c.code) + (c.base_feet_agl != null ? ' ' + c.base_feet_agl + 'ft' : ''))
      .join(' · ');
  } else if (m.conditions && m.conditions.length > 0) {
    // algunos METAR tienen CAVOK como condición
    const cav = m.conditions.find(c => c.code === 'CAVOK');
    if (cav) nubesStr = 'CAVOK (sin nubes significativas)';
  }

  // ── Temperatura y humedad ────────────────────────────────
  // CheckWX decoded: m.temperature.celsius, m.dewpoint.celsius, m.humidity.percent
  const tempStr = m.temperature && m.temperature.celsius != null ? m.temperature.celsius + '°C' : '—';
  const humStr  = m.humidity    && m.humidity.percent    != null ? m.humidity.percent    + '%'  : '';

  // ── Presión ──────────────────────────────────────────────
  // CheckWX decoded: m.barometer.hpa
  const presStr = m.barometer && m.barometer.hpa != null ? m.barometer.hpa + ' hPa' : '—';

  // ── Hora observación ─────────────────────────────────────
  let horaObs = '';
  if (m.observed) {
    try {
      horaObs = new Date(m.observed).toLocaleTimeString('es-AR', {
        hour:'2-digit', minute:'2-digit', hour12:false,
        timeZone:'America/Argentina/Buenos_Aires'
      }) + ' hs';
    } catch(e) {}
  }

  // ── METAR raw ────────────────────────────────────────────
  const rawOb = m.raw_text || '';

  el.innerHTML =
    `<div class="metar-header">` +
      `<div class="metar-badge ${cat.cls}">${cat.emoji} ${cat.label} — ${cat.desc}</div>` +
      (horaObs ? `<span class="metar-hora">${horaObs}</span>` : '') +
    `</div>` +
    `<div class="metar-grid">` +
      `<div class="metar-item"><span class="metar-lbl">Temperatura</span><span class="metar-val">${tempStr}</span></div>` +
      (humStr ? `<div class="metar-item"><span class="metar-lbl">Humedad</span><span class="metar-val">${humStr}</span></div>` : '') +
      `<div class="metar-item"><span class="metar-lbl">Viento</span><span class="metar-val">${wStr}</span></div>` +
      `<div class="metar-item"><span class="metar-lbl">Visibilidad</span><span class="metar-val">${visStr}</span></div>` +
      `<div class="metar-item"><span class="metar-lbl">Presión</span><span class="metar-val">${presStr}</span></div>` +
      `<div class="metar-item metar-item-full"><span class="metar-lbl">Nubes</span><span class="metar-val">${nubesStr}</span></div>` +
    `</div>` +
    (rawOb ? `<details class="metar-raw-wrap"><summary class="metar-raw-toggle">METAR raw</summary><code class="metar-raw">${rawOb}</code></details>` : '') +
    `<p class="metar-credit"><a href="https://www.checkwxapi.com" target="_blank" rel="noopener">CheckWX Aviation Weather</a> · ${icao} · Actualización cada 30 min</p>`;
}


/* ── POI CERCANOS (Overpass / OpenStreetMap) ─────────────── */
async function loadPOI(d, lat, lng) {
  const blockId  = 'poi_' + d.nombre.replace(/[^a-z0-9]/gi,'_');
  const today    = new Date().toISOString().slice(0,10);
  const cacheKey = 'poi_' + lat.toFixed(2) + '_' + lng.toFixed(2) + '_' + today;
  // Radio definido en scope global de la función (no dentro del if)
  const radio = 30000;

  let poiData = null;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) poiData = JSON.parse(cached);
  } catch(e) {}

  if (poiData === null) {
    const query =
      '[out:json][timeout:20];(' +
      'node["tourism"~"viewpoint|museum|attraction|camp_site|information"](around:' + radio + ',' + lat + ',' + lng + ');' +
      'node["historic"~"ruins|monument"](around:' + radio + ',' + lat + ',' + lng + ');' +
      'node["natural"="peak"]["name"](around:' + radio + ',' + lat + ',' + lng + ');' +
      'node["amenity"~"fuel|restaurant|hospital"](around:' + radio + ',' + lat + ',' + lng + ');' +
      'node["tourism"="hotel"](around:' + radio + ',' + lat + ',' + lng + ');' +
      ');out body 60;';

    try {
      const ctrl = new AbortController();
      const tid   = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(
        'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query),
        { signal: ctrl.signal }
      );
      clearTimeout(tid);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();

      // Agrupar por categoría — solo elementos CON nombre
      const cats = {
        'miradores':   { emoji:'🏔', label:'Miradores',       items:[] },
        'atractivos':  { emoji:'⭐', label:'Atractivos',       items:[] },
        'museos':      { emoji:'🏛', label:'Museos',           items:[] },
        'historico':   { emoji:'🏺', label:'Sitios históricos',items:[] },
        'cumbres':     { emoji:'⛰', label:'Cumbres',           items:[] },
        'combustible': { emoji:'⛽', label:'Combustible',      items:[] },
        'alojamiento': { emoji:'🛏', label:'Alojamiento',      items:[] },
        'camping':     { emoji:'🏕', label:'Campings',          items:[] },
        'restaurant':  { emoji:'🍽', label:'Restaurantes',     items:[] },
        'info':        { emoji:'ℹ', label:'Información',       items:[] },
        'hospital':    { emoji:'🏥', label:'Salud',            items:[] },
      };

      (json.elements || []).forEach(el => {
        const t = el.tags || {};
        const name = t.name || t['name:es'] || '';
        if (!name) return;   // descartar sin nombre
        const item = { name, lat: el.lat, lon: el.lon };
        const tv = t.tourism, av = t.amenity, hv = t.historic, nv = t.natural;
        if      (tv === 'viewpoint')              cats.miradores.items.push(item);
        else if (tv === 'museum')                 cats.museos.items.push(item);
        else if (tv === 'attraction')             cats.atractivos.items.push(item);
        else if (tv === 'camp_site')              cats.camping.items.push(item);
        else if (tv === 'hotel')                  cats.alojamiento.items.push(item);
        else if (tv === 'information')            cats.info.items.push(item);
        else if (hv === 'ruins' || hv === 'monument') cats.historico.items.push(item);
        else if (nv === 'peak')                   cats.cumbres.items.push(item);
        else if (av === 'fuel')                   cats.combustible.items.push(item);
        else if (av === 'restaurant')             cats.restaurant.items.push(item);
        else if (av === 'hospital')               cats.hospital.items.push(item);
        else if (av === 'hotel')                  cats.alojamiento.items.push(item);
      });

      // Guardar solo cats con resultados, máx 5 por cat
      poiData = {};
      Object.entries(cats).forEach(([k,v]) => {
        if (v.items.length > 0)
          poiData[k] = { emoji: v.emoji, label: v.label, items: v.items.slice(0,5) };
      });
      try { sessionStorage.setItem(cacheKey, JSON.stringify(poiData)); } catch(e) {}
    } catch(e) {
      const el = document.getElementById(blockId);
      if (el) el.style.display = 'none';
      return;
    }
  }

  const el = document.getElementById(blockId);
  if (!el) return;

  // Sin resultados con nombre → ocultar silenciosamente
  const cats = Object.values(poiData);
  if (cats.length === 0) {
    el.style.display = 'none';
    return;
  }

  // Construir HTML
  const catHTML = cats.map(c =>
    `<div class="poi-cat">` +
      `<span class="poi-cat-title">${c.emoji} ${c.label}</span>` +
      `<ul class="poi-list">` +
        c.items.map(i =>
          `<li class="poi-item">` +
            `<a href="https://www.google.com/maps/search/?api=1&query=${i.lat},${i.lon}" ` +
               `target="_blank" rel="noopener" class="poi-link">${i.name}</a>` +
          `</li>`
        ).join('') +
      `</ul>` +
    `</div>`
  ).join('');

  el.innerHTML =
    `<div class="sec-title"><span class="sec-title-icon">📍</span>Cerca de esta ruta</div>` +
    `<div class="poi-grid">${catHTML}</div>` +
    `<p class="poi-credit">` +
      `<a href="https://www.openstreetmap.org" target="_blank" rel="noopener">OpenStreetMap</a>` +
      ` · Overpass API · Radio 30 km` +
    `</p>`;
}


/* ── OPEN-METEO: UV, CALIDAD DEL AIRE, CLIMA HISTÓRICO ─────── */
async function loadOpenMeteo(d, lat, lng) {
  const blockId  = 'om_' + d.nombre.replace(/[^a-z0-9]/gi,'_');
  const el = document.getElementById(blockId);
  if (!el) return;

  const today    = new Date().toISOString().slice(0,10);
  const tz       = 'America%2FArgentina%2FBuenos_Aires';
  const cacheKey = 'om_' + lat.toFixed(2) + '_' + lng.toFixed(2) + '_' + today;

  // ── helpers ──
  function uvLabel(uv) {
    if (uv === null) return { txt: 'S/D', cls: '' };
    if (uv <= 2)  return { txt: 'Bajo',      cls: 'om-uv-bajo' };
    if (uv <= 5)  return { txt: 'Moderado',  cls: 'om-uv-mod' };
    if (uv <= 7)  return { txt: 'Alto',      cls: 'om-uv-alto' };
    if (uv <= 10) return { txt: 'Muy alto',  cls: 'om-uv-muyalto' };
    return              { txt: 'Extremo',    cls: 'om-uv-extremo' };
  }
  function uvProt(uv) {
    if (uv === null || uv <= 2) return 'Sin protección necesaria';
    if (uv <= 5)  return 'Protección recomendada';
    if (uv <= 7)  return 'Protección necesaria · evitar mediodía';
    if (uv <= 10) return 'Protección alta · sombra obligatoria';
    return 'Protección máxima · evitar exposición';
  }
  function aqiLabel(aqi) {
    if (aqi === null) return { txt: 'S/D', cls: '', emoji: '⚪' };
    if (aqi <= 20)  return { txt: 'Muy bueno', cls: 'om-aqi-bueno',   emoji: '🟢' };
    if (aqi <= 40)  return { txt: 'Bueno',     cls: 'om-aqi-bueno',   emoji: '🟢' };
    if (aqi <= 60)  return { txt: 'Regular',   cls: 'om-aqi-regular', emoji: '🟡' };
    if (aqi <= 80)  return { txt: 'Malo',      cls: 'om-aqi-malo',    emoji: '🟠' };
    if (aqi <= 100) return { txt: 'Muy malo',  cls: 'om-aqi-muymalo', emoji: '🔴' };
    return               { txt: 'Pésimo',     cls: 'om-aqi-pesimo',  emoji: '🟣' };
  }
  function windDir(deg) {
    if (deg === null) return '—';
    const dirs = ['N','NE','E','SE','S','SO','O','NO'];
    return dirs[Math.round(deg/45) % 8];
  }
  function windArrow(deg) {
    if (deg === null) return '';
    return `<span class="om-wind-arrow" style="transform:rotate(${deg}deg)">↑</span> `;
  }
  function mesNombre(n) {
    return ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
            'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][n-1] || '';
  }

  // ── fetch datos de hoy ──
  let omData = null;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) omData = JSON.parse(cached);
  } catch(e) {}

  if (!omData) {
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 10000);

      const [resF, resA] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=uv_index_max,temperature_2m_max,temperature_2m_min,windspeed_10m_max,winddirection_10m_dominant,precipitation_probability_max&forecast_days=1&timezone=${tz}`, { signal: ctrl.signal }),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=european_aqi,pm2_5&forecast_days=1&timezone=${tz}`, { signal: ctrl.signal })
      ]);
      clearTimeout(tid);

      const jF = resF.ok  ? await resF.json()  : null;
      const jA = resA.ok  ? await resA.json()  : null;

      const d0 = jF?.daily;
      const aqiArr = jA?.hourly?.european_aqi || [];
      const pm25   = jA?.hourly?.pm2_5        || [];
      // promedio AQI horas diurnas (6h–20h)
      const aqiDay = aqiArr.filter((_,i) => { const h = i % 24; return h >= 6 && h <= 20; });
      const aqiAvg = aqiDay.length ? Math.round(aqiDay.reduce((a,b)=>a+(b||0),0)/aqiDay.length) : null;
      const pm25Avg = pm25.filter((_,i)=>{ const h=i%24; return h>=6&&h<=20; });
      const pm25Val = pm25Avg.length ? Math.round(pm25Avg.reduce((a,b)=>a+(b||0),0)/pm25Avg.length) : null;

      omData = {
        uv:     d0?.uv_index_max?.[0]            ?? null,
        tmax:   d0?.temperature_2m_max?.[0]       ?? null,
        tmin:   d0?.temperature_2m_min?.[0]       ?? null,
        wind:   d0?.windspeed_10m_max?.[0]        ?? null,
        windDg: d0?.winddirection_10m_dominant?.[0] ?? null,
        rain:   d0?.precipitation_probability_max?.[0] ?? null,
        aqi:    aqiAvg,
        pm25:   pm25Val,
      };
      try { sessionStorage.setItem(cacheKey, JSON.stringify(omData)); } catch(e) {}
    } catch(e) {
      el.style.display = 'none';
      return;
    }
  }

  // ── HTML bloque hoy ──
  const uv  = uvLabel(omData.uv);
  const aqi = aqiLabel(omData.aqi);

  const htmlHoy =
    `<div class="om-section-title">☀️ Condiciones hoy en la ruta</div>` +
    `<div class="om-grid">` +
      `<div class="om-card">` +
        `<span class="om-card-label">Índice UV</span>` +
        `<span class="om-card-value ${uv.cls}">${omData.uv !== null ? omData.uv.toFixed(1) : '—'}</span>` +
        `<span class="om-card-sub">${uv.txt}</span>` +
      `</div>` +
      `<div class="om-card">` +
        `<span class="om-card-label">Protección solar</span>` +
        `<span class="om-card-value" style="font-size:13px;line-height:1.3">${uvProt(omData.uv)}</span>` +
      `</div>` +
      `<div class="om-card">` +
        `<span class="om-card-label">Viento máx.</span>` +
        `<span class="om-card-value">${windArrow(omData.windDg)}${omData.wind !== null ? Math.round(omData.wind)+' km/h' : '—'}</span>` +
        `<span class="om-card-sub">del ${windDir(omData.windDg)}</span>` +
      `</div>` +
      `<div class="om-card">` +
        `<span class="om-card-label">Prob. lluvia</span>` +
        `<span class="om-card-value">${omData.rain !== null ? omData.rain+'%' : '—'}</span>` +
      `</div>` +
      `<div class="om-card">` +
        `<span class="om-card-label">Calidad del aire</span>` +
        `<span class="om-card-value ${aqi.cls}">${aqi.emoji} ${aqi.txt}</span>` +
        `<span class="om-card-sub">AQI ${omData.aqi !== null ? omData.aqi : '—'}${omData.pm25 !== null ? ' · PM2.5 '+omData.pm25+' µg/m³' : ''}</span>` +
      `</div>` +
      `<div class="om-card">` +
        `<span class="om-card-label">Temperatura</span>` +
        `<span class="om-card-value">${omData.tmax !== null ? Math.round(omData.tmax)+'°' : '—'}` +
          `<span style="font-size:13px;color:var(--ink-lt)"> / ${omData.tmin !== null ? Math.round(omData.tmin)+'°' : '—'}</span></span>` +
        `<span class="om-card-sub">máx / mín del día</span>` +
      `</div>` +
    `</div>`;

  // ── Selector de mes para clima histórico ──
  const now   = new Date();
  const defMes = now.getMonth() + 1; // mes actual
  const selId  = 'om_mes_' + d.nombre.replace(/[^a-z0-9]/gi,'_');
  const omId   = blockId;

  const htmlMes =
    `<div class="om-section-title">📅 Clima histórico por mes</div>` +
    `<div class="om-mes-row">` +
      `<select class="om-mes-select" id="${selId}" onchange="loadOMHistorico('${omId}','${selId}',${lat},${lng})">` +
        [1,2,3,4,5,6,7,8,9,10,11,12].map(m =>
          `<option value="${m}"${m===defMes?' selected':''}>${mesNombre(m)}</option>`
        ).join('') +
      `</select>` +
    `</div>` +
    `<div id="${omId}_hist"><div class="om-loading">📊 Cargando promedios históricos…</div></div>`;

  const htmlCredit =
    `<p class="om-credit"><a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a> · datos libres</p>`;

  el.innerHTML = htmlHoy + htmlMes + htmlCredit;

  // cargar histórico del mes actual inmediatamente
  loadOMHistorico(omId, selId, lat, lng);
}

/* ── OPEN-METEO: CLIMA HISTÓRICO MENSUAL ────────────────────── */
async function loadOMHistorico(omId, selId, lat, lng) {
  const selEl  = document.getElementById(selId);
  const histEl = document.getElementById(omId + '_hist');
  if (!selEl || !histEl) return;

  const mes  = parseInt(selEl.value);
  const year = new Date().getFullYear() - 1; // año anterior completo
  const pad  = n => String(n).padStart(2,'0');
  const dias = new Date(year, mes, 0).getDate();
  const from = `${year}-${pad(mes)}-01`;
  const to   = `${year}-${pad(mes)}-${pad(dias)}`;
  const cKey = `om_hist_${lat.toFixed(2)}_${lng.toFixed(2)}_${year}_${mes}`;

  let hist = null;
  try {
    const c = sessionStorage.getItem(cKey);
    if (c) hist = JSON.parse(c);
  } catch(e) {}

  if (!hist) {
    histEl.innerHTML = '<div class="om-loading">📊 Cargando…</div>';
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 10000);
      const res  = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
        `&start_date=${from}&end_date=${to}` +
        `&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,windspeed_10m_max` +
        `&timezone=America%2FArgentina%2FBuenos_Aires`,
        { signal: ctrl.signal }
      );
      clearTimeout(tid);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      const dd = j.daily;
      const avg = arr => arr && arr.length ? (arr.reduce((a,b)=>a+(b||0),0)/arr.filter(x=>x!==null).length) : null;
      const sum = arr => arr && arr.length ? arr.reduce((a,b)=>a+(b||0),0) : null;
      const max = arr => arr && arr.length ? Math.max(...arr.filter(x=>x!==null)) : null;
      hist = {
        tmax:  avg(dd.temperature_2m_max),
        tmin:  avg(dd.temperature_2m_min),
        tmean: avg(dd.temperature_2m_mean),
        prec:  sum(dd.precipitation_sum),
        vmax:  max(dd.windspeed_10m_max),
      };
      try { sessionStorage.setItem(cKey, JSON.stringify(hist)); } catch(e) {}
    } catch(e) {
      histEl.innerHTML = '<div class="om-loading">Sin datos históricos disponibles</div>';
      return;
    }
  }

  const r = v => v !== null ? Math.round(v*10)/10 : '—';
  const meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  histEl.innerHTML =
    `<div class="om-grid">` +
      `<div class="om-card">` +
        `<span class="om-card-label">Temp. media</span>` +
        `<span class="om-card-value">${r(hist.tmean)}°C</span>` +
        `<span class="om-card-sub">${meses[mes]} ${year}</span>` +
      `</div>` +
      `<div class="om-card">` +
        `<span class="om-card-label">Temp. max / min</span>` +
        `<span class="om-card-value">${r(hist.tmax)}° / ${r(hist.tmin)}°</span>` +
        `<span class="om-card-sub">promedio diario</span>` +
      `</div>` +
      `<div class="om-card">` +
        `<span class="om-card-label">Lluvia acumulada</span>` +
        `<span class="om-card-value">${r(hist.prec)} mm</span>` +
        `<span class="om-card-sub">total del mes</span>` +
      `</div>` +
      `<div class="om-card">` +
        `<span class="om-card-label">Viento máx.</span>` +
        `<span class="om-card-value">${r(hist.vmax)} km/h</span>` +
        `<span class="om-card-sub">ráfaga mensual</span>` +
      `</div>` +
    `</div>`;
}

/* ── HIGHLIGHT ───────────────────────────────────────────── */
function highlight(text, query) {
  if (!query || !text) return text||"";
  const norm = query.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  let out = text;
  norm.split(/\s+/).filter(Boolean).forEach(tok => {
    const re = new RegExp("("+tok.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","gi");
    out = out.replace(re,'<span class="hl">$1</span>');
  });
  return out;
}

/* ── SIDEBAR LIST ────────────────────────────────────────── */
function renderList() {
  const filtered = getFiltered();
  document.getElementById("sideCount").textContent =
    filtered.length + (filtered.length===1?" camino":" caminos");

  const list = document.getElementById("sideList");
  list.innerHTML = "";

  if (filtered.length === 0) {
    list.innerHTML = '<div class="no-results"><div class="no-results-icon">🔍</div><div class="no-results-txt">Sin resultados</div></div>';
    return;
  }

  const favs = getFavs(), dones = getDones();
  filtered.forEach(d => {
    const el = document.createElement("div");
    el.className = "route-item"; el.dataset.nombre = d.nombre; el.dataset.tipo = d.tipo;
    const k = itemKey(d);
    const isFav=!!favs[k], isDone=!!dones[k];

    const difCls = d.dif==="BAJA"?"b-baja":d.dif==="MEDIA"?"b-media":(d.dif==="ALTA"||d.dif==="MUY ALTA")?"b-alta":"b-nd";
    const supBase = d.sup.split("/")[0];
    const supCls = supBase==="ASFALTO"?"b-asfalto":supBase==="RIPIO"?"b-ripio":supBase==="MIXTO"?"b-mixto":"b-nd";
    const difBadge = d.dif!=="—"?`<span class="badge ${difCls}">${d.dif}</span>`:"";
    const supBadge = d.sup!=="—"?`<span class="badge ${supCls}">${d.sup}</span>`:"";

    // Large icons in the list when active
    const shared = !!localStorage.getItem('shared_'+k);
    const icons = (isFav?'<span class="ri-icon fav-icon" title="Favorito">♥</span>':"") +
                  (isDone?'<span class="ri-icon done-icon" title="Visitado">✓</span>':"") +
                  (shared?'<span class="ri-icon share-icon" title="Compartido">✈</span>':"");

    el.innerHTML =
      `<div class="ri-type">${d.tipo}</div>` +
      `<div class="ri-name-row"><span class="ri-name">${highlight(d.nombre,searchQuery)}</span><span class="ri-icons">${icons}</span></div>` +
      `<div class="ri-prov">${highlight(d.prov,searchQuery)}${d.ruta?" · "+d.ruta:""}</div>` +
      `<div class="ri-badges">${difBadge}${supBadge}</div>`;

    el.addEventListener("click", () => {
      const yaHabiaSeleccion = !!activeItemEl;
      if (activeItemEl) activeItemEl.classList.remove("active");
      el.classList.add("active");
      activeItemEl = el;
      document.querySelector(".main").classList.add("has-selection");
      // En mobile ocultamos la sidebar completamente
      if (window.innerWidth <= 680) {
        document.querySelector(".sidebar").style.display = "none";
      }
      document.getElementById("detail").scrollTop = 0;
      renderDetail(d);
      if (yaHabiaSeleccion) {
        history.replaceState({ itemIndex: DATA.indexOf(d) }, "");
      } else {
        history.pushState({ itemIndex: DATA.indexOf(d) }, "");
      }
    });
    list.appendChild(el);
  });
}

/* ── DETAIL PANEL ────────────────────────────────────────── */

/* ── PRECAUCIONES — renderizado con íconos por categoría ───── */
function renderPrec(prec) {
  if (!prec) return '';

  // Mapeo: [palabras_clave, emoji]
  const PREC_MAP = [
    [['altura','4000','msnm','gran altitud','ruta en altura','camino a gran altitud'], '⛰️'],
    [['sinuoso','curvas','angosto','montaña'], '〰️'],
    [['hielo','helada'], '🧊'],
    [['frio','frío','temperatura baj','temperaturas baj','invierno','frio intenso','frío intenso'], '🥶'],
    [['calor','verano','temperatura alt','temperaturas alt','calor muy'], '🌡️'],
    [['señal celular','sin señal','atencion señal'], '📵'],
    [['animales salvajes'], '🐆'],
    [['animales sueltos','cruce de animales','precaucion animales','animales en el'], '🐄'],
    [['combustible','sin combustible'], '⛽'],
    [['viento'], '💨'],
    [['lluvia','barroso'], '🌧️'],
    [['4x4','cuatro por cuatro','ideal vehiculo'], '🚙'],
    [['ripio','tierra','arenoso','médanos','medanos'], '🪨'],
    [['fuego','prohibicion'], '🔥'],
    [['ciclistas','turistas caminando'], '🚶'],
    [['agua','abrigo','comida','sin servicios'], '🎒'],
  ];

  function getEmoji(txt) {
    const t = txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    for (const [kws, emoji] of PREC_MAP) {
      for (const kw of kws) {
        const k = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        if (t.includes(k)) return emoji;
      }
    }
    return '⚠️';
  }

  // Separar por \n (Alt+Enter) o " - " o " – "
  let items;
  if (prec.includes('\n')) {
    items = prec.split('\n');
  } else if (prec.includes(' - ') || prec.includes(' – ')) {
    items = prec.split(/ [-–] /);
  } else if (prec.includes(' -')) {
    items = prec.split(' -');
  } else {
    items = [prec];
  }

  return items
    .map(s => s.trim())
    .filter(s => s && s !== '0')
    .map(s => `<div class="prec-item"><span class="prec-icon">${getEmoji(s)}</span><span class="prec-txt-item">${s}</span></div>`)
    .join('');
}

function renderDetail(d) {
  currentDetail = d;

  // ── Google Tag Manager — evento ruta_vista ───────────────
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event:          'ruta_vista',
      ruta_nombre:    d.nombre,
      ruta_tipo:      d.tipo,
      ruta_provincia: d.prov,
      ruta_altitud:   d.alt  || 0,
      ruta_dificultad:d.dif  || '',
      ruta_superficie:d.sup  || '',
    });
  } catch(e) {}
  // ──────────────────────────────────────────────────────────

  const det   = document.getElementById("detail");
  const color = TIPO_COLORS[d.tipo]||"#7A3A18";
  const desc  = TIPO_DESCS[d.tipo]||"";
  const altStr = d.alt ? d.alt.toLocaleString("es-AR")+" m" : "S/D";
  const favs = getFavs(), dones = getDones(), k = itemKey(d);
  const isFav=!!favs[k], isDone=!!dones[k];

  const difColor = d.dif==="BAJA"?"var(--dif-baja)":d.dif==="MEDIA"?"var(--dif-media)":(d.dif==="ALTA"||d.dif==="MUY ALTA")?"#C0100A":"var(--ink-lt)";
  const supBase  = d.sup.split("/")[0];
  const supColor = supBase==="ASFALTO"?"#2A5A7A":supBase==="RIPIO"?"var(--ink-md)":supBase==="MIXTO"?"#5A3A7A":"var(--ink-lt)";

  const slug = (d.tipo+"_"+d.nombre).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");

  const tipoLabel = d.tipo==="RUTA ESCÉNICA"?"Rutas Escénicas":d.tipo.charAt(0)+d.tipo.slice(1).toLowerCase()+"s";
  function esc(s){ return (s||'').replace(/\\/g,"\\\\").replace(/'/g,"\\'"); }
  const mapSrcJs = d.mapSrc ? `'${esc(d.mapSrc)}'` : "null";
  const obsClass = d.warn?"obs-warn":(d.obs.toLowerCase().startsWith("de ")||d.obs.toLowerCase().startsWith("desde "))?"obs-route":"obs-info";

  // Map img helper — uses explicit filename fields when present, falls back to slug
  function mapImg(slugSuffix, label, explicitFile) {
    const src = explicitFile ? `mapas/${explicitFile}` : `mapas/${slug}${slugSuffix}.jpg`;
    return `<div class="map-container" id="mapa_${slug}${slugSuffix}">` +
      `<img src="${src}" alt="Mapa ${d.nombre}" ` +
      `style="width:100%;height:auto;max-width:100%;max-height:70vh;object-fit:contain;display:block;" ` +
      `onload="this.nextElementSibling.style.display='none'" onerror="this.parentElement.style.display='none'"/>` +
      `<div class="map-placeholder"><div class="map-placeholder-icon">🗺</div><div class="map-placeholder-txt">${label}</div></div>` +
      `</div>`;
  }

  det.classList.remove('detail-enter');
  // forzar reflow para reiniciar la animación
  void det.offsetWidth;
  det.classList.add('detail-enter');

  det.innerHTML =
    `<div class="hero-accent-bar" style="background:${color}"></div>` +
    `<div class="hero-band">` +
      `<div class="hero-accent" style="color:${color}">${d.tipo}</div>` +
      `<div class="hero-title-row">` +
        `<div class="hero-title">${d.nombre}</div>` +
        `<div class="hero-state-badges">` +
          (isFav  ? `<span class="state-badge fav-badge"  title="Favorito">♥</span>`   : '') +
          (isDone ? `<span class="state-badge done-badge" title="Visitado">✓</span>`   : '') +
        `</div>` +
      `</div>` +
      `<div class="hero-loc">◈ ${d.prov}${d.ruta?" · "+d.ruta:""}</div>` +
      `<div class="hero-actions">` +
        `<button class="action-btn fav-btn${isFav?" active":""}" onclick="toggleFav(currentDetail)">♥ <span class="action-label">Favorito</span></button>` +
        `<button class="action-btn done-btn${isDone?" active":""}" onclick="toggleDone(currentDetail)">✓ <span class="action-label">Visitado</span></button>` +
        `<button class="action-btn share-btn" onclick="shareRuta(currentDetail)" title="Compartir">` +
          `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">` +
            `<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>` +
            `<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>` +
          `</svg>` +
          `<span class="action-label">Compartir</span>` +
        `</button>` +
        `<button class="action-btn next-btn" onclick="goNextItem()" title="Siguiente ruta">` +
          `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">` +
            `<polyline points="9 18 15 12 9 6"/>` +
          `</svg>` +
          `<span class="action-label">Siguiente</span>` +
        `</button>` +
      `</div>` +
    `</div>` +

    // Stats
    `<div class="stats-grid">` +
      `<div class="stat"><span class="stat-val">${altStr}</span><span class="stat-key">Altitud máx.</span></div>` +
      `<div class="stat"><span class="stat-val" style="color:${difColor}">${d.dif}</span><span class="stat-key">Dificultad</span></div>` +
      `<div class="stat"><span class="stat-val" style="color:${supColor}">${d.sup}</span><span class="stat-key">Superficie</span></div>` +
      `<div class="stat"><span class="stat-val">${d.ruta||"—"}</span><span class="stat-key">Ruta</span></div>` +
    `</div>` +

    // Observaciones — TTS button junto al título
    (d.obs ? `<div class="obs-block obs-above-map">` +
      `<div class="obs-title-row">` +
        `<div class="sec-title"><span class="sec-title-icon">📝</span>Observaciones</div>` +
        `<button class="tts-btn" onclick="speakObs(this.dataset.text,this)" title="Escuchar" ` +
          `data-text="${(d.obs||'').replace(/\n/g,' ').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">` +
          `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">` +
            `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>` +
            `<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>` +
            `<path d="M19.07 4.93a10 10 0 0 1 0 14.14" class="tts-wave2"/>` +
          `</svg>` +
          `<span class="tts-label">Escuchar</span>` +
        `</button>` +
      `</div>` +
      `<span class="obs-tag ${obsClass}">${d.warn?"⚠ ":""}${d.obs}</span>` +
      `</div>` : "") +

    // Mapa
    `<div class="map-section"><div class="sec-title"><span class="sec-title-icon">🗺</span>Mapa</div>` +
      `<div class="map-btns-row">` +
        (d.mapNoDisp
          ? `<div class="gmaps-btn gmaps-nodisp">📍 Ruta no disponible en Google Maps</div>`
          : `<button class="gmaps-btn" onclick="openMaps('${esc(d.nombre)}','${esc(d.prov)}','${esc(d.tipo)}',${mapSrcJs})">` +
              `<svg width="15" height="15" viewBox="0 0 48 48"><path d="M24 4C16.27 4 10 10.27 10 18c0 10.5 14 26 14 26s14-15.5 14-26c0-7.73-6.27-14-14-14z" fill="#EA4335"/><circle cx="24" cy="18" r="5" fill="#fff"/></svg>` +
              `Ver en Google Maps</button>` +
                        (() => {
              if (!d.wazeSrc) return '';
              const mc = d.wazeSrc.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
              if (!mc) return '';
              const lat = mc[1], lng = mc[2];
              // Usar Maps Places API URL con "near:" para anclar a las coords de la ruta
              // y no a la ubicación del usuario aunque tenga GPS activo
              const url = `https://www.google.com/maps/search/estaci%C3%B3n+de+servicio+nafta+near:${lat},${lng}/@${lat},${lng},12z`;
              return `<a class="estacion-btn" href="${url}" target="_blank" rel="noopener">⛽ Estaciones</a>`;
            })()
        ) +
      `</div>` +
      (!d.mapImgHidden ? mapImg('', `Mapa de ${d.nombre}`, d.mapImg||null) : "") +
      (d.hasMap2 ? '<div class="map-sep"></div>' + mapImg('_2', `Mapa 2 de ${d.nombre}`, d.mapImg2||null) : "") +
    `</div>` +

    // Galería — usa foto1/foto2 explícitos si existen, si no cae al slug
    (!d.noPhotos
      ? `<div class="photos-section" id="gallery_${slug}"><div class="sec-title">Galería</div>` +
        `<div class="photos-pair">` +
          `<div class="photo-container" id="foto1_${slug}"><img src="fotos/${d.foto1||slug+'_1.jpg'}" alt="foto 1" onload="this.nextElementSibling.style.display='none'" onerror="this.parentElement.style.display='none';checkGalleryEmpty('gallery_${slug}')"/><div class="photo-placeholder"><div class="photo-placeholder-icon">📷</div><div class="photo-placeholder-txt">Foto 1</div></div></div>` +
          `<div class="photo-container" id="foto2_${slug}"><img src="fotos/${d.foto2||slug+'_2.jpg'}" alt="foto 2" onload="this.nextElementSibling.style.display='none'" onerror="this.parentElement.style.display='none';checkGalleryEmpty('gallery_${slug}')"/><div class="photo-placeholder"><div class="photo-placeholder-icon">📷</div><div class="photo-placeholder-txt">Foto 2</div></div></div>` +
        `</div></div>`
      : ""
    ) +

    // Ícono Master (antes de Mejor época, mismo estilo que PN)
    (d.iconoMaster ? `<div class="pn-block master-block"><img src="iconos/${d.iconoMaster}" class="master-icon" alt="Ruta principal"></div>` : '') +

    // Perfil altimétrico GPX — carga asíncrona si hay archivo JSON
    `<div class="perfil-block" id="perfil_${slug}"></div>` +

    // Mejor época
    (d.epoca ? `<div class="info-block epoca-block"><div class="sec-title"><span class="sec-title-icon">🗓</span>Mejor época</div><p class="info-txt epoca-txt">${d.epoca}</p></div>` : "") +

    // Precauciones — con íconos por categoría
    (d.prec ? `<div class="info-block prec-block"><div class="sec-title">⚠️ Precauciones</div><div class="prec-list">${renderPrec(d.prec)}</div></div>` : "") +

    // Iconos
    `<div class="stats-grid icon-grid">` +
      `<div class="stat icon-stat">${d.icono ? `<img src="iconos/${d.icono}" class="stat-ruta-icon" alt="">` : ``}</div>` +
      `<div class="stat icon-stat">${d.icono2 ? `<img src="iconos/${d.icono2}" class="stat-ruta-icon" alt="">` : ``}</div>` +
      `<div class="stat icon-stat">${d.icono3 ? `<img src="iconos/${d.icono3}" class="stat-ruta-icon" alt="">` : ``}</div>` +
      `<div class="stat icon-stat">${d.icono4 ? `<img src="iconos/${d.icono4}" class="stat-ruta-icon" alt="">` : ``}</div>` +
    `</div>` +

    // Fiestas y eventos
    (d.fiestas ? `<div class="info-block fiestas-block"><div class="sec-title">🎉 Fiestas y Eventos</div><p class="info-txt fiestas-txt">${d.fiestas}</p></div>` : '') +

    // Ícono Parque Nacional + descripción PN
    (d.iconopn || d.pnDesc || d.pnNombre ?
      `<div class="pn-block">` +
        `<div class="sec-title pn-section-title">Parque Nacional Cercano a Esta Ruta</div>` +
        (d.pnNombre ? `<p class="pn-nombre">${d.pnNombre.toUpperCase()}</p>` : '') +
        (d.iconopn  ? `<img src="iconos/${d.iconopn}" class="pn-icon" alt="Parque Nacional">` : '') +
        (d.pnDesc   ?
          `<div class="pn-desc-wrap">` +
            `<button class="tts-btn pn-tts-btn" onclick="speakObs(this.dataset.text,this)" ` +
              `data-text="${d.pnDesc.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">` +
              `<svg class="tts-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">` +
                `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>` +
                `<path class="tts-wave1" d="M15.54 8.46a5 5 0 0 1 0 7.07"/>` +
                `<path class="tts-wave2" d="M19.07 4.93a10 10 0 0 1 0 14.14"/>` +
              `</svg>` +
              `Escuchar` +
            `</button>` +
            `<p class="pn-desc">${d.pnDesc}</p>` +
          `</div>`
        : (d.iconopn ? `<div class="pn-desc-wrap"></div>` : '')) +
      `</div>`
    : '') +

    // 4 íconos del PN con etiqueta
    (d.iconoPn1 || d.iconoPn2 || d.iconoPn3 || d.iconoPn4 ?
      `<div class="pn-icons-section">` +
        `<div class="sec-title pn-section-title"><span class="sec-title-icon">🏃</span>Actividades en Este Parque Nacional</div>` +
        `<div class="stats-grid pn-icons-grid">` +
          (d.iconoPn1 ? `<div class="stat-box icon-stat"><img src="iconos/${d.iconoPn1}" class="stat-ruta-icon" alt=""/></div>` : '<div class="stat-box icon-stat"></div>') +
          (d.iconoPn2 ? `<div class="stat-box icon-stat"><img src="iconos/${d.iconoPn2}" class="stat-ruta-icon" alt=""/></div>` : '<div class="stat-box icon-stat"></div>') +
          (d.iconoPn3 ? `<div class="stat-box icon-stat"><img src="iconos/${d.iconoPn3}" class="stat-ruta-icon" alt=""/></div>` : '<div class="stat-box icon-stat"></div>') +
          (d.iconoPn4 ? `<div class="stat-box icon-stat"><img src="iconos/${d.iconoPn4}" class="stat-ruta-icon" alt=""/></div>` : '<div class="stat-box icon-stat"></div>') +
        `</div>` +
      `</div>`
    : '') +

    // Íconos de seguridad PN (5-8) con etiqueta
    (d.iconoPn5 || d.iconoPn6 || d.iconoPn7 || d.iconoPn8 ?
      `<div class="pn-icons-section">` +
        `<div class="sec-title pn-section-title"><span class="sec-title-icon">🛡</span>Recomendaciones de Seguridad</div>` +
        `<div class="stats-grid pn-icons-grid pn-seg-grid">` +
          (d.iconoPn5 ? `<div class="stat-box icon-stat"><img src="iconos/${d.iconoPn5}" class="stat-ruta-icon" alt=""/></div>` : '<div class="stat-box icon-stat"></div>') +
          (d.iconoPn6 ? `<div class="stat-box icon-stat"><img src="iconos/${d.iconoPn6}" class="stat-ruta-icon" alt=""/></div>` : '<div class="stat-box icon-stat"></div>') +
          (d.iconoPn7 ? `<div class="stat-box icon-stat"><img src="iconos/${d.iconoPn7}" class="stat-ruta-icon" alt=""/></div>` : '<div class="stat-box icon-stat"></div>') +
          (d.iconoPn8 ? `<div class="stat-box icon-stat"><img src="iconos/${d.iconoPn8}" class="stat-ruta-icon" alt=""/></div>` : '<div class="stat-box icon-stat"></div>') +
        `</div>` +
      `</div>`
    : '') +

    // Contacto del PN con etiqueta
    (d.telPn || d.mailPn ?
      `<div class="contact-pn-block">` +
        `<div class="sec-title pn-section-title"><span class="sec-title-icon">📞</span>Contacto Parque Nacional</div>` +
        (d.telPn  ? `<a href="tel:${d.telPn}"   class="contact-pn-link"><span class="contact-icon">📞</span>${d.telPn}</a>`  : '') +
        (d.mailPn ? `<a href="mailto:${d.mailPn}" class="contact-pn-link"><span class="contact-icon">✉️</span>${d.mailPn}</a>` : '') +
      `</div>`
    : '') +

    // Lugares de Interés (fotos con pie de foto)
    (d.liF1 || d.liF2 || d.liF3 ?
      `<div class="li-block">` +
        `<div class="sec-title"><span class="sec-title-icon">📍</span>Lugares de Interés</div>` +
        (d.liF1 ? `<div class="li-item map-container">` +
          `<img src="fotos/${d.liF1}" class="li-photo" alt="${d.liT1||'Lugar de interés'}" onerror="this.closest('.li-item').style.display='none'"/>` +
          (d.liT1 ? `<p class="li-caption">${d.liT1}</p>` : '') +
        `</div>` : '') +
        (d.liF2 ? `<div class="li-item map-container">` +
          `<img src="fotos/${d.liF2}" class="li-photo" alt="${d.liT2||'Lugar de interés'}" onerror="this.closest('.li-item').style.display='none'"/>` +
          (d.liT2 ? `<p class="li-caption">${d.liT2}</p>` : '') +
        `</div>` : '') +
        (d.liF3 ? `<div class="li-item map-container">` +
          `<img src="fotos/${d.liF3}" class="li-photo" alt="${d.liT3||'Lugar de interés'}" onerror="this.closest('.li-item').style.display='none'"/>` +
          (d.liT3 ? `<p class="li-caption">${d.liT3}</p>` : '') +
        `</div>` : '') +
      `</div>`
    : '') +

    // Widget de clima
    (d.weatherUrl ?
      `<div class="weather-block">` +
        `<div class="sec-title">🌤 El clima en el punto cercano a la ruta</div>` +
        `<div class="weather-inner">` +
          `<a class="weatherwidget-io"` +
            ` href="${d.weatherUrl}"` +
            ` data-label_1="${d.weatherLabel.toUpperCase()}"` +
            ` data-label_2="clima"` +
            ` data-icons="Climacons Animated"` +
            ` data-mode="Current"` +
            ` data-theme="pure"` +
            ` data-basecolor="#F2E8CC"` +
            ` data-textcolor="#4F3B26"` +
            ` data-highcolor="#C0100A"` +
            ` data-lowcolor="#1A5276"` +
            ` data-suncolor="#A0552A"` +
            ` data-cloudscolor="#7A5A38"` +
            ` data-raincolor="#1A5276"` +
            ` data-snowcolor="#2E86C1"` +
          `>${d.weatherLabel} clima</a>` +
        `</div>` +
        (d.weatherUrl2 ?
          `<div class="weather-inner weather-inner-extra">` +
            `<a class="weatherwidget-io"` +
              ` href="${d.weatherUrl2}"` +
              ` data-label_1="${(d.weatherLabel2||'').toUpperCase()}"` +
              ` data-label_2="clima"` +
              ` data-icons="Climacons Animated"` +
              ` data-mode="Current"` +
              ` data-theme="pure"` +
              ` data-basecolor="#F2E8CC"` +
              ` data-textcolor="#4F3B26"` +
              ` data-highcolor="#C0100A"` +
              ` data-lowcolor="#1A5276"` +
              ` data-suncolor="#A0552A"` +
              ` data-cloudscolor="#7A5A38"` +
              ` data-raincolor="#1A5276"` +
              ` data-snowcolor="#2E86C1"` +
            `>${d.weatherLabel2||''} clima</a>` +
          `</div>` : '') +
        (d.weatherUrl3 ?
          `<div class="weather-inner weather-inner-extra">` +
            `<a class="weatherwidget-io"` +
              ` href="${d.weatherUrl3}"` +
              ` data-label_1="${(d.weatherLabel3||'').toUpperCase()}"` +
              ` data-label_2="clima"` +
              ` data-icons="Climacons Animated"` +
              ` data-mode="Current"` +
              ` data-theme="pure"` +
              ` data-basecolor="#F2E8CC"` +
              ` data-textcolor="#4F3B26"` +
              ` data-highcolor="#C0100A"` +
              ` data-lowcolor="#1A5276"` +
              ` data-suncolor="#A0552A"` +
              ` data-cloudscolor="#7A5A38"` +
              ` data-raincolor="#1A5276"` +
              ` data-snowcolor="#2E86C1"` +
            `>${d.weatherLabel3||''} clima</a>` +
          `</div>` : '') +
      `</div>`
    : '') +

    // Open-Meteo — UV, calidad del aire, clima histórico
    (d.wazeSrc ? `<div class="openmeteo-block" id="om_${d.nombre.replace(/[^a-z0-9]/gi,'_')}">` +
      `<div class="om-loading">🌤 Cargando datos ambientales…</div>` +
    `</div>` : '') +

    // Sol (amanecer/atardecer) — carga asíncrona
    (d.wazeSrc ? `<div class="sol-block" id="sol_${d.nombre.replace(/[^a-z0-9]/gi,'_')}">` +
      `<div class="sol-loading">☀️ Cargando horarios del sol…</div>` +
    `</div>` : '') +

    // Mareas — solo para rutas costeras
    (d.wazeSrc && d.esCostera ? `<div class="mar-block" id="mar_${d.nombre.replace(/[^a-z0-9]/gi,'_')}">` +
      `<div class="mar-loading">🌊 Cargando condiciones marinas…</div>` +
    `</div>` : '') +

    // Incendios NASA FIRMS — carga asíncrona
    (d.wazeSrc ? `<div class="firms-block" id="firms_${d.nombre.replace(/[^a-z0-9]/gi,'_')}">` +
      `<div class="firms-loading">🔥 Verificando actividad ígnea…</div>` +
    `</div>` : '') +

    // Sismos USGS — carga asíncrona
    (d.wazeSrc ? `<div class="sismo-block" id="sismo_${d.nombre.replace(/[^a-z0-9]/gi,'_')}">` +
      `<div class="sismo-loading">🌎 Verificando actividad sísmica…</div>` +
    `</div>` : '') +

    // Paso Fronterizo (después del clima, antes de Acerca de)
    (d.pasoPf || d.horarioPf ?
      `<div class="pf-block">` +
        `<div class="sec-title"><span class="sec-title-icon">🛂</span>Paso Fronterizo Cercano</div>` +
        (d.pasoPf ? (() => {
          const pfLines = d.pasoPf.split('\n');
          const pfFirst = pfLines[0];
          const pfRest  = pfLines.slice(1).join('<br>');
          return `<p class="pf-txt pf-nombre pf-nombre-grande">${pfFirst}</p>` +
                 (pfRest ? `<p class="pf-txt pf-ciudades">${pfRest}</p>` : '');
        })() : '') +
        (d.horarioPf ? `<div id="pfstatus_${d.nombre.replace(/[^a-z0-9]/gi,'_')}" class="pf-status"></div>` : '') +
        (d.horarioPf? `<p class="pf-txt pf-horario">🕐 ${d.horarioPf.replace(/\n/g,'<br>')}</p>` : '') +
        (d.urlPf ?
          `<a href="${d.urlPf}" target="_blank" rel="noopener" class="pf-btn">` +
            `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">` +
              `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>` +
              `<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>` +
            `</svg>` +
            `Ver estado actual del paso` +
          `</a>`
        : '') +
      `</div>`
    : '') +

    // Descripción
    // Aeropuerto más cercano
    (d.aeroCiudad || d.aeroNombre ?
      `<div class="aero-block">` +
        `<div class="sec-title"><span class="sec-title-icon">✈</span>Aeropuerto Más Cercano a la Ruta</div>` +
        (d.aeroCiudad ? `<p class="aero-ciudad">${d.aeroCiudad}</p>` : '') +
        (d.aeroNombre ? `<p class="aero-nombre">${d.aeroNombre}</p>` : '') +
        `<div class="aero-btns-row">` +
          (d.aeroTel  ? `<a class="aero-tel" href="tel:${d.aeroTel}">📞 ${d.aeroTel}</a>` : '') +
          (d.aeroUbic ? `<button class="aero-map-btn" onclick="openMaps('Aeropuerto','${d.aeroCiudad||''}','','${d.aeroUbic}')">` +
            `<svg width="15" height="15" viewBox="0 0 48 48"><path d="M24 4C16.27 4 10 10.27 10 18c0 10.5 14 26 14 26s14-15.5 14-26c0-7.73-6.27-14-14-14z" fill="#EA4335"/><circle cx="24" cy="18" r="5" fill="#fff"/></svg>` +
            `Ver en Google Maps</button>` : '') +
        `</div>` +
        // METAR — condiciones meteorológicas del aeropuerto
        (d.aeroIcao ? `<div class="metar-block" id="metar_${d.aeroIcao}">` +
          `<div class="metar-loading">🛫 Cargando condiciones del aeropuerto…</div>` +
        `</div>` : '') +
      `</div>`
    : '') +

    // POI cercanos (Overpass/OSM) — carga asíncrona, solo si hay coords
    (d.wazeSrc ? `<div class="poi-block" id="poi_${d.nombre.replace(/[^a-z0-9]/gi,'_')}">` +
      `<div class="poi-loading">📍 Buscando lugares cercanos…</div>` +
    `</div>` : '') +

    `<div class="desc-block"><div class="sec-title"><span class="sec-title-icon">ℹ</span>Acerca de las ${tipoLabel}</div><p class="desc-txt">${desc}</p></div>` +
    `<div class="nav-footer">` +
      `<button class="nav-foot-btn prev-foot-btn" onclick="goPrevItem()">` +
        `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>` +
        `<span>Anterior</span>` +
      `</button>` +
      `<button class="nav-foot-btn next-foot-btn" onclick="goNextItem()">` +
        `<span>Siguiente</span>` +
        `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>` +
      `</button>` +
    `</div>` +
    `<div class="detail-footer"></div>`;

  // Inicializar widget de clima si esta ruta lo tiene
  if (d.weatherUrl || d.weatherUrl2 || d.weatherUrl3) {
    setTimeout(() => {
      if (window.__weatherwidget_init) {
        window.__weatherwidget_init();
      } else if (!document.getElementById('weatherwidget-io-js')) {
        var s = document.createElement('script');
        s.id  = 'weatherwidget-io-js';
        s.src = 'https://weatherwidget.io/js/widget.min.js';
        document.head.appendChild(s);
      }
    }, 150);
  }

  // Cargar semáforo de paso fronterizo
  if (d.horarioPf) loadPFStatus(d);

  // Cargar perfil altimétrico si hay GPX
  loadPerfil(d, slug);

  // Cargar amanecer/atardecer e incendios si hay coords
  if (d.wazeSrc) {
    const mc = d.wazeSrc.match(/ll=(-?[\d.]+),(-?[\d.]+)/);
    if (mc) {
      const lat = parseFloat(mc[1]);
      const lng = parseFloat(mc[2]);
      loadOpenMeteo(d, lat, lng);
      loadSol(d, lat, lng);
      loadFirms(d, lat, lng);
      loadSismos(d, lat, lng);
      if (d.esCostera) loadMar(d, lat, lng);
    }
  }
  // METAR — no necesita coords, usa aeroIcao directamente
  if (d.aeroIcao) loadMetar(d);
  // POI Overpass/OSM — solo si hay coords
  if (d.wazeSrc) {
    const mc2 = d.wazeSrc.match(/ll=(-?[\d.]+),(-?[\d.]+)/);
    if (mc2) loadPOI(d, parseFloat(mc2[1]), parseFloat(mc2[2]));
  }
}

/* ── SEMÁFORO PASO FRONTERIZO ────────────────────────────── */
function loadPFStatus(d) {
  if (!d.horarioPf) return;
  const slug    = d.nombre.replace(/[^a-z0-9]/gi, '_');
  const blockId = 'pfstatus_' + slug;
  const el      = document.getElementById(blockId);
  if (!el) return;

  // Limpia interval previo si se reabre la misma ruta
  if (el._pfInterval) clearInterval(el._pfInterval);

  function hhmm(h, m) { return h * 60 + m; }

  function parseRangos(txt) {
    // Extrae pares [{desde, hasta}] en minutos desde medianoche
    const rangos = [];
    const re = /(\d{1,2}):(\d{2})\s*[aA]\s*(\d{1,2}):(\d{2})/g;
    let m;
    while ((m = re.exec(txt)) !== null) {
      rangos.push({ desde: hhmm(+m[1], +m[2]), hasta: hhmm(+m[3], +m[4]) });
    }
    return rangos;
  }

  function mesAplica(txt) {
    // Detecta restricción de meses. Si existe y el mes actual no está, retorna false.
    const MESES = ['enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const re = /([a-záéíóúü]+)\s+a\s+([a-záéíóúü]+)\s*:/i;
    const m  = re.exec(txt);
    if (!m) return true; // sin restricción de mes
    const mesDesde = MESES.indexOf(m[1].toLowerCase());
    const mesHasta = MESES.indexOf(m[2].toLowerCase());
    if (mesDesde === -1 || mesHasta === -1) return true;
    const mesHoy = new Date().getMonth(); // 0-based
    if (mesDesde <= mesHasta) {
      return mesHoy >= mesDesde && mesHoy <= mesHasta;
    } else {
      // rango que cruza año: ej. Noviembre a Marzo
      return mesHoy >= mesDesde || mesHoy <= mesHasta;
    }
  }

  function diaAplica(linea) {
    // Retorna true si la línea aplica al día de hoy
    const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const diaHoy = new Date().getDay(); // 0=dom
    const l = linea.toLowerCase();
    if (/lunes\s+a\s+domingo/i.test(l))  return true;
    if (/lunes\s+a\s+viernes/i.test(l))  return diaHoy >= 1 && diaHoy <= 5;
    if (/sábados?/i.test(l) && !/domingo/i.test(l)) return diaHoy === 6;
    if (/domingos?/i.test(l) && !/sábado/i.test(l)) return diaHoy === 0;
    if (/sábados?\s+y\s+domingos?/i.test(l)) return diaHoy === 0 || diaHoy === 6;
    // Si la línea menciona "CERRADO" sin restricción de día, aplica siempre
    if (/cerrado/i.test(l)) return true;
    return true; // sin restricción reconocida → aplica
  }

  function render() {
    const txt = d.horarioPf;

    // Casos especiales: siempre abierto o siempre cerrado
    if (/abierto\s+las\s+24/i.test(txt)) {
      el.innerHTML = `<span class="pf-abierto">🟢 ABIERTO · 24 hs</span>`;
      return;
    }
    if (/cerrado\s+para\s+particulares/i.test(txt)) {
      el.innerHTML = `<span class="pf-cerrado-siempre">⚫ CERRADO PARA PARTICULARES</span>`;
      return;
    }
    if (/ver\s+estado\s+actual/i.test(txt)) {
      el.innerHTML = ''; // solo muestra el botón URL, sin semáforo
      return;
    }

    const ahora = new Date();
    const minAhora = hhmm(ahora.getHours(), ahora.getMinutes());

    // Procesar líneas (puede haber múltiples separadas por \n)
    const lineas = txt.split('\n').map(l => l.trim()).filter(Boolean);
    let estaAbierto = false;
    let proxCambio  = null; // minutos hasta próximo cambio

    for (const linea of lineas) {
      if (!diaAplica(linea)) continue;
      if (!mesAplica(linea))  continue;
      if (/cerrado/i.test(linea) && !parseRangos(linea).length) {
        // Línea de "CERRADO" sin rangos horarios
        continue;
      }
      const rangos = parseRangos(linea);
      for (const r of rangos) {
        if (minAhora >= r.desde && minAhora < r.hasta) {
          estaAbierto = true;
          const rem = r.hasta - minAhora;
          if (proxCambio === null || rem < proxCambio) proxCambio = rem;
        } else if (minAhora < r.desde) {
          // Aún no abrió hoy
          const rem = r.desde - minAhora;
          if (!estaAbierto && (proxCambio === null || rem < proxCambio)) proxCambio = rem;
        }
      }
    }

    // Si está cerrado y no hay rango futuro hoy → calcular hasta apertura del día siguiente
    if (!estaAbierto && proxCambio === null) {
      for (const linea of lineas) {
        if (!diaAplica(linea)) continue;
        const rangosMan = parseRangos(linea);
        for (const r of rangosMan) {
          const rem = 24 * 60 - minAhora + r.desde;
          if (proxCambio === null || rem < proxCambio) proxCambio = rem;
        }
      }
    }

    function fmtMin(m) {
      if (m === null) return '';
      const h = Math.floor(m / 60);
      const min = m % 60;
      if (h > 0 && min > 0) return `${h} h ${min} min`;
      if (h > 0)             return `${h} h`;
      return `${min} min`;
    }

    if (estaAbierto) {
      const cierra = proxCambio !== null
        ? ` <span class="pf-countdown">· Cierra en ${fmtMin(proxCambio)}</span>` : '';
      el.innerHTML = `<span class="pf-abierto">🟢 ABIERTO${cierra}</span>`;
    } else {
      const abre = proxCambio !== null
        ? ` <span class="pf-countdown">· Abre en ${fmtMin(proxCambio)}</span>` : '';
      el.innerHTML = `<span class="pf-cerrado">🔴 CERRADO${abre}</span>`;
    }
  }

  render();
  el._pfInterval = setInterval(render, 60000);
}

/* ── AMANECER / ATARDECER (sunrise-sunset.org) ───────────── */
async function loadSol(d, lat, lng) {
  const today    = new Date().toISOString().slice(0,10);
  const cacheKey = 'sol_' + lat.toFixed(3) + '_' + lng.toFixed(3) + '_' + today;
  const blockId  = 'sol_' + d.nombre.replace(/[^a-z0-9]/gi,'_');

  // Helpers de formato
  function fmtHora(iso) {
    return new Date(iso).toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit', hour12:false });
  }
  function fmtHoraHHMM(hhmm) {
    // USNO devuelve formato "HH:MM" en hora local ya con tz aplicado
    return hhmm || '—';
  }
  function fmtDuracion(seg) {
    const h = Math.floor(seg / 3600);
    const m = Math.floor((seg % 3600) / 60);
    return h + 'h ' + m + 'min';
  }
  function faseEmoji(phase) {
    const p = (phase || '').toLowerCase();
    if (p.includes('new'))            return '🌑';
    if (p.includes('waxing crescent'))return '🌒';
    if (p.includes('first quarter'))  return '🌓';
    if (p.includes('waxing gibbous')) return '🌔';
    if (p.includes('full'))           return '🌕';
    if (p.includes('waning gibbous')) return '🌖';
    if (p.includes('last quarter'))   return '🌗';
    if (p.includes('waning crescent'))return '🌘';
    return '🌙';
  }
  function faseLabel(phase) {
    const map = {
      'new moon':'Luna nueva', 'waxing crescent':'Cuarto creciente',
      'first quarter':'Cuarto creciente', 'waxing gibbous':'Gibosa creciente',
      'full moon':'Luna llena', 'waning gibbous':'Gibosa menguante',
      'last quarter':'Cuarto menguante', 'waning crescent':'Cuarto menguante'
    };
    return map[(phase||'').toLowerCase()] || phase || '—';
  }

  // Caché combinado
  let cache = null;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) cache = JSON.parse(cached);
  } catch(e) {}

  let solData = cache ? cache.sol : null;
  let lunaData = cache ? cache.luna : null;

  // Llamadas en paralelo si alguno falta
  const promises = [];

  if (!solData) {
    promises.push(
      fetch('https://api.sunrise-sunset.org/json?lat=' + lat + '&lng=' + lng +
            '&date=today&tzid=America/Argentina/Buenos_Aires&formatted=0')
        .then(r => r.json())
        .then(j => { if (j.status === 'OK') solData = j.results; })
        .catch(() => {})
    );
  }

  if (!lunaData) {
    // USNO: orto/ocaso de la luna + fase actual
    // Estructura real: properties.data = [{phen:"Rise"|"Set"|"Upper Transit", time:"HH:MM"}]
    // properties.curphase = "Waning Crescent" etc.
    // properties.fracillum = "72%" etc.
    const usnoUrl = 'https://aa.usno.navy.mil/api/rstt/oneday?date=' + today +
                    '&coords=' + lat.toFixed(4) + ',' + lng.toFixed(4) +
                    '&tz=-3&dst=false';
    promises.push(
      fetch(usnoUrl)
        .then(r => r.json())
        .then(j => {
          // Estructura real: j.properties.data.moondata, curphase, fracillum
          if (j && j.properties && j.properties.data) {
            const data = j.properties.data;
            lunaData = {
              moonrise: null,
              moonset:  null,
              phase:    data.curphase  || null,
              fracIlum: data.fracillum || null,
              nextPhase: data.closestphase ?
                         data.closestphase.day + '/' + data.closestphase.month : null,
            };
            (data.moondata || []).forEach(item => {
              if (item.phen === 'Rise') lunaData.moonrise = item.time;
              if (item.phen === 'Set')  lunaData.moonset  = item.time;
            });
          }
        })
        .catch(() => {})
    );
  }

  if (promises.length > 0) await Promise.all(promises);

  // Guardar en caché
  if (solData || lunaData) {
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ sol: solData, luna: lunaData })); } catch(e) {}
  }

  const el = document.getElementById(blockId);
  if (!el) return;

  if (!solData) { el.style.display = 'none'; return; }

  // ── Construir HTML ──
  let lunaHtml = '';
  if (lunaData) {
    const emoji = faseEmoji(lunaData.phase);
    const label = faseLabel(lunaData.phase);
    const ilum  = lunaData.fracIlum ? lunaData.fracIlum : null;

    lunaHtml =
      '<div class="sol-separator"></div>' +
      '<div class="sol-luna-title">🌙 Luna</div>' +
      '<div class="sol-grid">' +
        (lunaData.moonrise ?
          '<div class="sol-item">' +
            '<span class="sol-icono">🌅</span>' +
            '<span class="sol-label">Sale</span>' +
            '<span class="sol-hora">' + fmtHoraHHMM(lunaData.moonrise) + '</span>' +
          '</div>' : '') +
        (lunaData.moonset ?
          '<div class="sol-item">' +
            '<span class="sol-icono">🌇</span>' +
            '<span class="sol-label">Se oculta</span>' +
            '<span class="sol-hora">' + fmtHoraHHMM(lunaData.moonset) + '</span>' +
          '</div>' : '') +
        '<div class="sol-item">' +
          '<span class="sol-icono">' + emoji + '</span>' +
          '<span class="sol-label">Fase</span>' +
          '<span class="sol-hora sol-duracion">' + label + '</span>' +
        '</div>' +
        (ilum ?
          '<div class="sol-item">' +
            '<span class="sol-icono">✨</span>' +
            '<span class="sol-label">Iluminación</span>' +
            '<span class="sol-hora sol-duracion">' + ilum + '</span>' +
          '</div>' : '') +
        (lunaData.nextPhase ?
          '<div class="sol-item">' +
            '<span class="sol-icono">📅</span>' +
            '<span class="sol-label">Próxima fase</span>' +
            '<span class="sol-hora sol-duracion">' + lunaData.nextPhase + '</span>' +
          '</div>' : '') +
        // Edad de la luna — días transcurridos desde la última luna nueva
        // Ciclo lunar = 29.53 días. Se calcula a partir de la iluminación y la fase.
        (() => {
          let edadDias = null;
          if (lunaData.fracIlum && lunaData.phase) {
            const pct = parseFloat(lunaData.fracIlum) / 100;
            const esCreciente = /creciente|waxing|nueva/i.test(lunaData.phase);
            // iluminación = sin²(π/2 · fracción del ciclo)
            // fracción del ciclo = arcsin(sqrt(pct)) * 2/π
            const frac = esCreciente
              ? Math.asin(Math.sqrt(pct)) / Math.PI * 2 * 0.5
              : 1 - Math.asin(Math.sqrt(pct)) / Math.PI * 2 * 0.5;
            edadDias = Math.round(frac * 29.53);
          }
          return edadDias !== null
            ? '<div class="sol-item">' +
                '<span class="sol-icono">🔢</span>' +
                '<span class="sol-label">Edad de la luna</span>' +
                '<span class="sol-hora sol-duracion">' + edadDias + ' días</span>' +
              '</div>'
            : '';
        })() +
      '</div>';
  }

  el.innerHTML =
    '<div class="sec-title">🌅 Sol y luna hoy en esta ruta</div>' +
    '<div class="sol-grid">' +
      '<div class="sol-item">' +
        '<span class="sol-icono">🌄</span>' +
        '<span class="sol-label">Amanecer</span>' +
        '<span class="sol-hora">' + fmtHora(solData.sunrise) + '</span>' +
      '</div>' +
      '<div class="sol-item">' +
        '<span class="sol-icono">🌇</span>' +
        '<span class="sol-label">Atardecer</span>' +
        '<span class="sol-hora">' + fmtHora(solData.sunset) + '</span>' +
      '</div>' +
      '<div class="sol-item">' +
        '<span class="sol-icono">☀️</span>' +
        '<span class="sol-label">Mediodía solar</span>' +
        '<span class="sol-hora">' + fmtHora(solData.solar_noon) + '</span>' +
      '</div>' +
      '<div class="sol-item">' +
        '<span class="sol-icono">⏱</span>' +
        '<span class="sol-label">Luz del día</span>' +
        '<span class="sol-hora sol-duracion">' + fmtDuracion(solData.day_length) + '</span>' +
      '</div>' +
    '</div>' +
    lunaHtml +
    '<p class="sol-credit">' +
      '<a href="https://sunrise-sunset.org" target="_blank" rel="noopener">sunrise-sunset.org</a>' +
      (lunaData ? ' · <a href="https://aa.usno.navy.mil" target="_blank" rel="noopener">USNO</a>' : '') +
    '</p>';
}

/* ── PERFIL ALTIMÉTRICO (GPX + Open-Meteo) ───────────────── */
async function loadPerfil(d, slug) {
  const blockId  = 'perfil_' + slug;
  const el = document.getElementById(blockId);
  if (!el) return;

  // Nombre del archivo JSON: slug de la ruta
  const fname = slug.replace(/^(ruta_escenica_|ruta_escénica_|quebrada_|cuesta_|abra_)/, '') ;
  const jsonUrl = 'gpx/' + slug + '.json';

  // Intentar cargar el JSON de waypoints
  let gpxData = null;
  try {
    const cacheKey = 'perfil_' + slug;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { gpxData = JSON.parse(cached); }
    else {
      const res = await fetch(jsonUrl);
      if (!res.ok) return; // No hay GPX para esta ruta
      gpxData = await res.json();
    }
  } catch(e) { return; }

  if (!gpxData || !gpxData.puntos || gpxData.puntos.length === 0) return;

  // Mostrar loading
  el.innerHTML = '<div class="sec-title">📈 Perfil altimétrico</div><div class="perfil-loading">Cargando elevaciones…</div>';

  // Obtener elevaciones desde Open-Meteo (CORS habilitado en browsers)
  let eles = gpxData.puntos.map(p => p.ele || null);
  const sinEle = eles.some(e => e === null);

  if (sinEle) {
    try {
      const lats = gpxData.puntos.map(p => p.lat).join(',');
      const lngs = gpxData.puntos.map(p => p.lng).join(',');
      const url  = 'https://api.open-meteo.com/v1/elevation?latitude=' + lats + '&longitude=' + lngs;
      const res  = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      eles = data.elevation || eles;
      // Guardar con elevaciones
      gpxData.puntos = gpxData.puntos.map((p, i) => ({ ...p, ele: eles[i] }));
      try { sessionStorage.setItem('perfil_' + slug, JSON.stringify(gpxData)); } catch(e) {}
    } catch(e) {
      el.style.display = 'none';
      return;
    }
  }

  // ── Generar SVG del perfil ──
  const dists = gpxData.puntos.map(p => p.km);
  const totalKm = dists[dists.length - 1];
  const validEles = eles.filter(e => e !== null && e !== undefined);
  if (validEles.length === 0) { el.style.display = 'none'; return; }

  const minE = Math.min(...validEles);
  const maxE = Math.max(...validEles);
  const rango = maxE - minE || 1;

  const W = 320, H = 100, PL = 46, PR = 10, PT = 10, PB = 24;
  const gW = W - PL - PR, gH = H - PT - PB;

  // Convertir a coordenadas SVG
  function xSvg(km) { return PL + (km / totalKm) * gW; }
  function ySvg(e)  { return PT + gH - ((e - minE) / rango) * gH; }

  // Construir polyline
  const pts = gpxData.puntos
    .map((p, i) => eles[i] !== null ? xSvg(p.km).toFixed(1) + ',' + ySvg(eles[i]).toFixed(1) : null)
    .filter(Boolean)
    .join(' ');

  // Area bajo la curva (relleno)
  const firstX = xSvg(dists[0]).toFixed(1);
  const lastX  = xSvg(dists[dists.length-1]).toFixed(1);
  const bottomY = (PT + gH).toFixed(1);
  const areaPath = 'M ' + firstX + ',' + bottomY + ' L ' + pts.split(' ').map((p,i) => i===0 ? p : p).join(' L ') + ' L ' + lastX + ',' + bottomY + ' Z';

  // Etiquetas del eje Y
  const yTicks = 3;
  let yLabels = '';
  for (let i = 0; i <= yTicks; i++) {
    const e = minE + (rango * i / yTicks);
    const y = ySvg(e).toFixed(1);
    yLabels += '<text x="' + (PL - 4) + '" y="' + y + '" text-anchor="end" dominant-baseline="middle" font-size="8" fill="#8A6A50">' + Math.round(e) + '</text>';
    yLabels += '<line x1="' + PL + '" y1="' + y + '" x2="' + (PL + gW) + '" y2="' + y + '" stroke="#D4C080" stroke-width="0.5" stroke-dasharray="3,3"/>';
  }

  // Etiquetas del eje X
  const xTicks = 5;
  let xLabels = '';
  for (let i = 0; i <= xTicks; i++) {
    const km = totalKm * i / xTicks;
    const x = xSvg(km).toFixed(1);
    xLabels += '<text x="' + x + '" y="' + (PT + gH + 14) + '" text-anchor="middle" font-size="8" fill="#8A6A50">' + Math.round(km) + 'km</text>';
  }

  const svg =
    '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">' +
    '<rect width="' + W + '" height="' + H + '" fill="transparent"/>' +
    yLabels + xLabels +
    '<path d="' + areaPath + '" fill="rgba(160,85,42,0.12)"/>' +
    '<polyline points="' + pts + '" fill="none" stroke="#A0552A" stroke-width="1.5" stroke-linejoin="round"/>' +
    // Punto más alto
    (() => {
      const maxIdx = eles.indexOf(Math.max(...validEles));
      if (maxIdx < 0) return '';
      const mx = xSvg(dists[maxIdx]).toFixed(1);
      const my = ySvg(maxE).toFixed(1);
      return '<circle cx="' + mx + '" cy="' + my + '" r="3" fill="#C0100A"/>' +
             '<text x="' + mx + '" y="' + (parseFloat(my)-5) + '" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#C0100A">' + Math.round(maxE) + 'm</text>';
    })() +
    // Punto inicio y fin
    '<text x="' + xSvg(0) + '" y="' + (ySvg(eles[0] || minE) - 5) + '" text-anchor="start" font-size="7" fill="#5A3A18">' + Math.round(eles[0] || minE) + 'm</text>' +
    '</svg>';

  // Calcular pendiente máxima en grados
  // Usa ventana de 3 puntos para suavizar artefactos del SRTM (~90m resolución)
  // y clampea a 20° (máximo físico de una ruta vehicular real)
  const segDistM = (totalKm * 1000) / 99;
  const segDist3 = segDistM * 2; // distancia acumulada de 3 puntos
  let maxGrade = 0;
  for (let i = 2; i < eles.length; i++) {
    if (eles[i] === null || eles[i-2] === null) continue;
    const dh = Math.abs(eles[i] - eles[i-2]);
    const grad = Math.atan2(dh, segDist3) * 180 / Math.PI;
    const gradClamped = Math.min(grad, 20); // cap físico: ninguna ruta vehicular supera 20°
    if (gradClamped > maxGrade) maxGrade = gradClamped;
  }

  el.innerHTML =
    '<div class="sec-title">📈 Perfil altimétrico · ' + gpxData.distancia_km + ' km</div>' +
    '<div class="perfil-svg-wrap">' + svg + '</div>' +
    '<div class="perfil-stats">' +
      '<span>⬇ ' + Math.round(minE) + ' m</span>' +
      '<span>⬆ ' + Math.round(maxE) + ' m</span>' +
      '<span>↕ ' + Math.round(maxE - minE) + ' m desnivel</span>' +
      (maxGrade > 0 ? '<span>📐 ' + maxGrade.toFixed(1) + '° pend. máx.</span>' : '') +
    '</div>' +
    '<p class="perfil-credit"><a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a> · SRTM</p>';
}

function checkGalleryEmpty(id) {
  const g = document.getElementById(id); if (!g) return;
  if ([...g.querySelectorAll('.photo-container')].every(c=>c.style.display==='none')) g.style.display='none';
}

function emptyState() {
  return `<div class="empty-state">` +
    `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" width="36" height="36" opacity="0.2">` +
      `<circle cx="60" cy="60" r="57" fill="#A0552A"/>` +
      `<polygon points="60,6 64,52 60,58 56,52" fill="#1A0A02"/>` +
      `<polygon points="60,114 64,68 60,62 56,68" fill="#1A0A02"/>` +
      `<polygon points="6,60 52,56 58,60 52,64" fill="#1A0A02"/>` +
      `<polygon points="114,60 68,56 62,60 68,64" fill="#1A0A02"/>` +
      `<polygon points="18,18 52,54 58,60 50,52" fill="#C07040"/>` +
      `<polygon points="102,18 68,54 62,60 70,52" fill="#C07040"/>` +
      `<polygon points="18,102 52,66 58,60 50,68" fill="#C07040"/>` +
      `<polygon points="102,102 68,66 62,60 70,68" fill="#C07040"/>` +
      `<circle cx="60" cy="60" r="14" fill="#7A3A18"/>` +
      `<circle cx="60" cy="60" r="5" fill="#D4956A"/>` +
    `</svg>` +
    `<div class="empty-txt">Seleccioná un camino</div>` +
  `</div>`;
}

/* ── INIT ────────────────────────────────────────────────── */
// Arrancar sin ningún tipo activo = mostrar todos
renderList();

/* ── DEEP LINK: abrir ruta desde URL ─────────────────────── */
(function() {
  const params = new URLSearchParams(window.location.search);
  const rutaSlug = params.get('ruta');
  if (!rutaSlug) return;

  // Buscar la ruta cuyo slug coincida
  function makeSlug(d) {
    return (d.tipo + '_' + d.nombre).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  const match = DATA.find(d => makeSlug(d) === rutaSlug);
  if (!match) return;

  // Activar el filtro correcto para que la ruta esté en la lista
  activeTipo = match.tipo;
  renderList();

  // Encontrar y clickear el elemento de la lista
  const list = document.getElementById('sideList');
  const items = list.querySelectorAll('.route-item');
  for (const el of items) {
    // Comparar por nombre dentro del elemento
    const nameEl = el.querySelector('.ri-name');
    if (nameEl && nameEl.textContent.trim() === match.nombre) {
      // En mobile ocultar sidebar
      if (window.innerWidth <= 680) {
        document.querySelector('.sidebar').style.display = 'none';
      }
      if (activeItemEl) activeItemEl.classList.remove('active');
      el.classList.add('active');
      activeItemEl = el;
      document.querySelector('.main').classList.add('has-selection');
      document.getElementById('detail').scrollTop = 0;
      renderDetail(match);
      // Primero estado base (para que "atrás" vuelva al menú)
      // luego estado de la ruta encima
      history.replaceState({ base: true }, '');
      history.pushState({ itemIndex: DATA.indexOf(match) }, '');
      break;
    }
  }
})();

// Estado base en el historial: impide que el primer "atrás" salga de la app
history.replaceState({ base: true }, "");

/* ── BACK BUTTON ────────────────────────────────────────── */
window.addEventListener("popstate", (e) => {
  // 1. Primero: cerrar el mapa IGN si está abierto
  if (mapaIgnVisible) {
    toggleMapaView(true);
    return;
  }
  // 2. Después: si hay ruta seleccionada, volver al listado
  if (activeItemEl) {
    if (isSpeaking) { window.speechSynthesis.cancel(); isSpeaking = false; }
    document.querySelector(".sidebar").style.display = "";
    activeItemEl.classList.remove("active");
    activeItemEl = null;
    currentDetail = null;
    document.querySelector(".main").classList.remove("has-selection");
    document.getElementById("detail").innerHTML = emptyState();
    history.replaceState({ base: true }, "");
    return;
  }
  // 3. Si no hay nada abierto, el navegador sale de la app (comportamiento nativo)
});

/* ══════════════════════════════════════════════════════════
   LIGHTBOX v2 — zoom + pan correcto
   ══════════════════════════════════════════════════════════ */
(function () {
  const overlay = document.getElementById('lb-overlay');
  const img     = document.getElementById('lb-img');
  const btnClose= document.getElementById('lb-close');
  const badge   = document.getElementById('lb-badge');

  /* La imagen siempre está centrada con:
     transform: translate(-50%,-50%) translate(panX px, panY px) scale(zoom)
     panX/panY son desplazamientos en px desde el centro. */

  let zoom = 1, minZoom = 1, maxZoom = 6;
  let panX = 0, panY = 0;
  let vpW = 0, vpH = 0;
  let natW = 0, natH = 0;  // tamaño natural de la imagen
  let dispW = 0, dispH = 0; // tamaño desplegado (fit-to-screen)

  function applyTransform(animated) {
    img.style.transition = animated ? 'transform 0.22s ease' : 'none';
    img.style.transform = `translate(-50%,-50%) translate(${panX}px,${panY}px) scale(${zoom})`;
  }

  function clampPan() {
    // Tamaño visual real = tamaño natural × zoom (zoom ya incluye el fit inicial)
    const scaledW = natW * zoom;
    const scaledH = natH * zoom;
    const limitX = Math.max(0, (scaledW - vpW) / 2);
    const limitY = Math.max(0, (scaledH - vpH) / 2);
    panX = Math.max(-limitX, Math.min(limitX, panX));
    panY = Math.max(-limitY, Math.min(limitY, panY));
  }

  function showBadge() {
    badge.textContent = Math.round(zoom * 100) + '%';
    badge.style.opacity = '1';
    clearTimeout(badge._t);
    badge._t = setTimeout(() => { badge.style.opacity = '0'; }, 1400);
  }

  function resetView(animated) {
    zoom = minZoom; panX = 0; panY = 0;
    applyTransform(animated);
  }

  /* zoom hacia/desde un punto (cx,cy) = coordenadas relativas al CENTRO del viewport */
  function zoomAt(cx, cy, factor) {
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom * factor));
    if (newZoom === zoom) return;
    const ratio = newZoom / zoom;
    panX = cx + ratio * (panX - cx);
    panY = cy + ratio * (panY - cy);
    zoom = newZoom;
    clampPan();
    applyTransform(false);
    showBadge();
    if (zoom <= minZoom * 1.01) resetView(true);
  }

  /* ── Abrir ── */
  function open(src) {
    img.style.transition = 'none';
    img.style.transform  = 'translate(-50%,-50%) scale(1)';
    img.src = '';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    const tmp = new Image();
    tmp.onload = () => {
      vpW  = overlay.clientWidth;
      vpH  = overlay.clientHeight;
      natW = tmp.naturalWidth;
      natH = tmp.naturalHeight;

      // Calcular tamaño desplegado (fit dentro del viewport)
      const scaleToFit = Math.min(vpW / natW, vpH / natH, 1);
      dispW = natW * scaleToFit;
      dispH = natH * scaleToFit;

      // Asignar tamaño explícito a la imagen
      img.style.width  = natW + 'px';
      img.style.height = natH + 'px';

      minZoom = scaleToFit;
      zoom    = scaleToFit;
      panX    = 0; panY = 0;

      img.src = src;
      applyTransform(false);
    };
    tmp.src = src;
  }

  function close() {
    overlay.classList.remove('open');
    img.src = '';
    document.body.style.overflow = '';
  }

  btnClose.addEventListener('click', e => { e.stopPropagation(); close(); });
  btnClose.addEventListener('touchend', e => { e.stopPropagation(); e.preventDefault(); close(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });

  /* ══ MOUSE ══ */
  let mDrag = false, mSX, mSY, mPX, mPY;

  img.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    mDrag = true; mSX = e.clientX; mSY = e.clientY; mPX = panX; mPY = panY;
    img.classList.add('grabbing');
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!mDrag) return;
    panX = mPX + e.clientX - mSX;
    panY = mPY + e.clientY - mSY;
    clampPan();
    applyTransform(false);
  });
  window.addEventListener('mouseup', () => { mDrag = false; img.classList.remove('grabbing'); });

  overlay.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = overlay.getBoundingClientRect();
    const cx = e.clientX - rect.left - vpW / 2;
    const cy = e.clientY - rect.top  - vpH / 2;
    zoomAt(cx, cy, e.deltaY < 0 ? 1.12 : 0.89);
  }, { passive: false });

  /* ══ TOUCH ══ */
  let t1 = null, t2 = null;
  let tPX, tPY, tStartX, tStartY;
  let pinchDist0, pinchZoom0, pinchPX0, pinchPY0, pinchMidX0, pinchMidY0;
  let lastTap = 0, lastTapX = 0, lastTapY = 0;

  function ptDist(a, b) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }
  function ptMid(a, b, rect) {
    return {
      x: (a.clientX + b.clientX) / 2 - rect.left - vpW / 2,
      y: (a.clientY + b.clientY) / 2 - rect.top  - vpH / 2
    };
  }

  overlay.addEventListener('touchstart', e => {
    e.preventDefault();
    const touches = e.touches;

    if (touches.length === 1) {
      t1 = touches[0]; t2 = null;
      tStartX = t1.clientX; tStartY = t1.clientY;
      tPX = panX; tPY = panY;

      // Doble tap
      const now = Date.now();
      const dx = t1.clientX - lastTapX, dy = t1.clientY - lastTapY;
      if (now - lastTap < 280 && Math.hypot(dx, dy) < 50) {
        lastTap = 0;
        const rect = overlay.getBoundingClientRect();
        const cx = t1.clientX - rect.left - vpW / 2;
        const cy = t1.clientY - rect.top  - vpH / 2;
        if (zoom > minZoom * 1.15) {
          resetView(true); showBadge();
        } else {
          const target = Math.min(maxZoom, minZoom * 3);
          const ratio  = target / zoom;
          panX = cx + ratio * (panX - cx);
          panY = cy + ratio * (panY - cy);
          zoom = target;
          clampPan();
          applyTransform(true);
          showBadge();
        }
      } else {
        lastTap = now; lastTapX = t1.clientX; lastTapY = t1.clientY;
      }
    }

    if (touches.length === 2) {
      t1 = touches[0]; t2 = touches[1];
      const rect = overlay.getBoundingClientRect();
      pinchDist0  = ptDist(t1, t2);
      pinchZoom0  = zoom;
      pinchPX0    = panX;
      pinchPY0    = panY;
      const mid   = ptMid(t1, t2, rect);
      pinchMidX0  = mid.x;
      pinchMidY0  = mid.y;
    }
  }, { passive: false });

  overlay.addEventListener('touchmove', e => {
    e.preventDefault();
    const touches = e.touches;

    if (touches.length === 1 && !t2) {
      // Pan — sólo cuando hay zoom activo
      if (zoom > minZoom * 1.02) {
        panX = tPX + touches[0].clientX - tStartX;
        panY = tPY + touches[0].clientY - tStartY;
        clampPan();
        applyTransform(false);
      }
    }

    if (touches.length === 2) {
      t1 = touches[0]; t2 = touches[1];
      const rect  = overlay.getBoundingClientRect();
      const dist  = ptDist(t1, t2);
      const mid   = ptMid(t1, t2, rect);
      const factor= dist / pinchDist0;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, pinchZoom0 * factor));
      const ratio   = newZoom / pinchZoom0;
      panX = pinchMidX0 + ratio * (pinchPX0 - pinchMidX0);
      panY = pinchMidY0 + ratio * (pinchPY0 - pinchMidY0);
      // Seguir el desplazamiento del punto medio
      panX += mid.x - pinchMidX0;
      panY += mid.y - pinchMidY0;
      zoom = newZoom;
      clampPan();
      applyTransform(false);
      showBadge();
    }
  }, { passive: false });

  overlay.addEventListener('touchend', e => {
    const touches = e.touches;
    if (touches.length < 2) { t2 = null; }
    if (touches.length === 1) {
      t1 = touches[0];
      tStartX = t1.clientX; tStartY = t1.clientY; tPX = panX; tPY = panY;
    }
    if (touches.length === 0) {
      t1 = null;
      if (zoom < minZoom * 1.05) resetView(true);
    }
  }, { passive: false });

  /* ── Delegación: click en img dentro de .map-container ── */
  document.getElementById('detail').addEventListener('click', e => {
    const mapImg = e.target.closest('.map-container img');
    if (mapImg && mapImg.complete && mapImg.naturalWidth > 0) {
      open(mapImg.src);
    }
  });

})();

/* ── MAPA IGN (Leaflet) ──────────────────────────────────── */
let mapaIgnInstance = null;
let mapaIgnVisible  = false;

const TIPO_MARKER_COLOR = {
  'ABRA':          '#7A5A18',
  'CUESTA':        '#5A3A18',
  'QUEBRADA':      '#3A5A18',
  'RUTA ESCÉNICA': '#1A3A5A',
};

function toggleMapaView(fromPopstate) {
  const btn   = document.getElementById('btnMapaView');
  const panel = document.getElementById('mapaIgnPanel');
  mapaIgnVisible = !mapaIgnVisible;

  if (mapaIgnVisible) {
    panel.style.display = 'block';
    btn.classList.add('active');
    const toolbar = document.querySelector('.toolbar');
    const header  = document.querySelector('.header');
    const topOff  = header.offsetHeight + toolbar.offsetHeight;
    panel.style.top = topOff + 'px';
    initMapaIgn();
    // Empujar estado al historial para que el Atrás lo cierre
    if (!fromPopstate) history.pushState({ mapaIgn: true }, '');
  } else {
    panel.style.display = 'none';
    btn.classList.remove('active');
  }
}

function centrarMapaEnRutaActual() {
  if (!mapaIgnInstance || !currentDetail || !currentDetail.wazeSrc) return;
  const m = currentDetail.wazeSrc.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) {
    mapaIgnInstance.setView([parseFloat(m[1]), parseFloat(m[2])], 9);
    // Abrir el popup del marcador correspondiente
    mapaIgnInstance.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        const ll = layer.getLatLng();
        if (Math.abs(ll.lat - parseFloat(m[1])) < 0.001 &&
            Math.abs(ll.lng - parseFloat(m[2])) < 0.001) {
          layer.openPopup();
        }
      }
    });
  }
}

function initMapaIgn() {
  if (mapaIgnInstance) {
    // Ya inicializado — invalidar tamaño y centrar en ruta activa si hay una
    mapaIgnInstance.invalidateSize();
    centrarMapaEnRutaActual();
    return;
  }

  // Centrar en Argentina
  mapaIgnInstance = L.map('mapaIgn', {
    center: [-38, -63],
    zoom: 4,
    zoomControl: true,
  });

  // Capa base IGN color
  L.tileLayer(
    'https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG%3A3857@png/{z}/{x}/{-y}.png',
    {
      attribution: '<a href="https://www.ign.gob.ar" target="_blank">IGN Argentina</a> + <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a>',
      minZoom: 3,
      maxZoom: 18,
    }
  ).addTo(mapaIgnInstance);

  // Agregar marcadores de todas las rutas con coords (excluir ocultas)
  DATA.forEach(d => {
    if (d.hidden) return;
    if (!d.wazeSrc) return;
    const m = d.wazeSrc.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (!m) return;
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    const color = TIPO_MARKER_COLOR[d.tipo] || '#7A3A18';

    // Marcador círculo SVG con color por tipo
    const icon = L.divIcon({
      className: '',
      html: `<div class="ign-marker-icon" style="background:${color};"></div>`,
      iconSize:   [20, 20],
      iconAnchor: [10, 10],
      popupAnchor:[0, -12],
    });

    const marker = L.marker([lat, lng], { icon }).addTo(mapaIgnInstance);

    // Popup con info y botón para ir al detalle
    const popupHtml = `
      <div class="ign-popup-tipo" style="color:${color}">${d.tipo}</div>
      <div class="ign-popup-nombre">${d.nombre}</div>
      <div class="ign-popup-prov">${d.prov}${d.alt ? ' · ' + d.alt + ' msnm' : ''}</div>
      <button class="ign-popup-btn" onclick="seleccionarDesdeMapaIgn('${d.nombre.replace(/'/g,"\\'")}','${d.tipo}')">
        Ver detalle →
      </button>`;

    marker.bindPopup(popupHtml, { maxWidth: 200, minWidth: 160 });
  });

  // Si ya hay una ruta seleccionada, centrar y abrir su popup
  centrarMapaEnRutaActual();
}

function seleccionarDesdeMapaIgn(nombre, tipo) {
  // Cerrar el mapa y abrir el detalle de la ruta
  toggleMapaView();
  const d = DATA.find(x => x.nombre === nombre && x.tipo === tipo);
  if (!d) return;
  // Simular click en la ruta del sidebar
  const items = document.querySelectorAll('.route-item');
  items.forEach(el => {
    if (el.dataset.nombre === nombre && el.dataset.tipo === tipo) {
      el.click();
      el.scrollIntoView({ block: 'center' });
    }
  });
}

