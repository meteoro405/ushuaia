/* app.js — Sitios de interés en Ushuaia
   Versión reducida de "De Cuestas, Abras y Quebradas": una guía de puntos de interés de la ciudad.
   Vanilla JS, sin build. Los datos vienen de data.js (generado desde datos/Ushuaia.csv). */
'use strict';

/* ── CONSTANTES ──────────────────────────────────────────── */
const TZ          = 'America/Argentina/Ushuaia';
const CENTRO_MAPA = [-54.8019, -68.3030];          // centro de la ciudad
// Claves de localStorage con prefijo propio: en GitHub Pages todas las apps de
// meteoro405.github.io comparten el mismo origen, así que NO hay que pisar 'favs'/'dones'.
const LS_FAVS   = 'ush_favs';
const LS_DONES  = 'ush_dones';
const LS_SHARED = 'ush_shared_';

let activeFilter = 'TODOS';   // TODOS | FAVORITOS | VISITADOS
let searchQuery  = '';
let activeItemEl = null;
let currentDetail = null;

/* ── HELPERS ─────────────────────────────────────────────── */
function h(s) {                      // escapa HTML
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function nl2br(s) { return h(s).replace(/\n/g, '<br>'); }
function noAcc(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function slugify(s) { return noAcc(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
function tipoLabel(t) { return String(t || '').replace('INTERES', 'INTERÉS'); }
function hasCoords(d) { return typeof d.lat === 'number' && typeof d.lng === 'number'; }
function fileUrl(folder, name) { return folder + '/' + encodeURIComponent(name).replace(/%2F/g, '/'); }

/* ── STORAGE ─────────────────────────────────────────────── */
function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; } }
function getFavs()  { return readJSON(LS_FAVS); }
function getDones() { return readJSON(LS_DONES); }
function itemKey(d) { return d.tipo + '|' + d.nombre; }

function toggleFav(d) {
  const favs = getFavs(), k = itemKey(d);
  favs[k] ? delete favs[k] : (favs[k] = true);
  try { localStorage.setItem(LS_FAVS, JSON.stringify(favs)); } catch (e) {}
  renderList(); renderDetail(d);
}
function toggleDone(d) {
  const dones = getDones(), k = itemKey(d);
  dones[k] ? delete dones[k] : (dones[k] = true);
  try { localStorage.setItem(LS_DONES, JSON.stringify(dones)); } catch (e) {}
  renderList(); renderDetail(d);
}

/* ── ELEMENTOS ───────────────────────────────────────────── */
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const elMain      = document.querySelector('.main');
const elSidebar   = document.querySelector('.sidebar');
const elDetail    = document.getElementById('detail');

/* ── LISTA / FILTROS ─────────────────────────────────────── */
function getFiltered() {
  const favs = getFavs(), dones = getDones();
  const q = noAcc(searchQuery);
  return DATA.filter(d => {
    if (d.hidden) return false;
    if (q) {
      const hay = noAcc([d.nombre, d.tipo, d.obs, d.epoca, d.liT1, d.liT2, d.liT3].join(' '));
      if (!q.split(/\s+/).every(tok => hay.includes(tok))) return false;
    }
    const k = itemKey(d);
    if (activeFilter === 'FAVORITOS') return !!favs[k];
    if (activeFilter === 'VISITADOS') return !!dones[k];
    return true;
  }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

function highlight(text, query) {
  const safe = h(text);
  if (!query || !text) return safe;
  let out = safe;
  noAcc(query).split(/\s+/).filter(Boolean).forEach(tok => {
    const re = new RegExp('(' + h(tok).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    out = out.replace(re, '<span class="hl">$1</span>');
  });
  return out;
}

function renderList() {
  const filtered = getFiltered();
  document.getElementById('sideCount').textContent =
    filtered.length + (filtered.length === 1 ? ' sitio' : ' sitios');

  const list = document.getElementById('sideList');
  list.innerHTML = '';
  activeItemEl = null;

  if (!filtered.length) {
    const msg = activeFilter === 'FAVORITOS' ? 'Todavía no marcaste favoritos'
              : activeFilter === 'VISITADOS' ? 'Todavía no marcaste sitios como visitados'
              : 'Sin resultados';
    list.innerHTML = '<div class="no-results"><div class="no-results-icon">🔍</div><div class="no-results-txt">' + msg + '</div></div>';
    return;
  }

  const favs = getFavs(), dones = getDones();
  filtered.forEach(d => {
    const el = document.createElement('div');
    el.className = 'route-item';
    el.dataset.nombre = d.nombre; el.dataset.tipo = d.tipo;
    const k = itemKey(d);
    const icons =
      (favs[k]  ? '<span class="ri-icon fav-icon" title="Favorito">♥</span>' : '') +
      (dones[k] ? '<span class="ri-icon done-icon" title="Visitado">✓</span>' : '') +
      (localStorage.getItem(LS_SHARED + k) ? '<span class="ri-icon share-icon" title="Compartido">✈</span>' : '');
    const sub = d.obs ? d.obs.split('\n')[0] : '';

    el.innerHTML =
      '<div class="ri-type">' + h(tipoLabel(d.tipo)) + '</div>' +
      '<div class="ri-name-row"><span class="ri-name">' + highlight(d.nombre, searchQuery) + '</span><span class="ri-icons">' + icons + '</span></div>' +
      (sub ? '<div class="ri-prov">' + h(sub) + '</div>' : '');

    el.addEventListener('click', () => selectItem(d, el));
    if (currentDetail && itemKey(currentDetail) === k) { el.classList.add('active'); activeItemEl = el; }
    list.appendChild(el);
  });
}

function selectItem(d, el) {
  const yaHabia = !!activeItemEl;
  if (activeItemEl) activeItemEl.classList.remove('active');
  if (el) { el.classList.add('active'); activeItemEl = el; }
  elMain.classList.add('has-selection');
  if (window.innerWidth <= 680) elSidebar.style.display = 'none';
  elDetail.scrollTop = 0;
  renderDetail(d);
  if (yaHabia) history.replaceState({ item: d.nombre }, '');
  else         history.pushState({ item: d.nombre }, '');
}

function backToList() {
  stopSpeaking();
  if (activeItemEl) activeItemEl.classList.remove('active');
  activeItemEl = null; currentDetail = null;
  elSidebar.style.display = '';
  elMain.classList.remove('has-selection');
  elDetail.innerHTML = emptyState();
  clearHorarioTimer();
}

function resetSearch() {
  searchInput.value = ''; searchQuery = '';
  searchClear.classList.remove('visible');
}

function filterSpecial(f, btn) {
  if (activeFilter === f) {
    activeFilter = 'TODOS';
    document.querySelectorAll('.filter-special').forEach(b => b.classList.remove('active'));
  } else {
    activeFilter = f;
    document.querySelectorAll('.filter-special').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  resetSearch();
  backToList();
  renderList();
}

function showRandom() {
  resetSearch();
  const filtered = getFiltered();
  if (!filtered.length) return;
  const d = filtered[Math.floor(Math.random() * filtered.length)];
  renderList();
  const el = [...document.querySelectorAll('#sideList .route-item')]
    .find(x => x.dataset.nombre === d.nombre && x.dataset.tipo === d.tipo);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  selectItem(d, el || null);
}

function goNextItem() { stepItem(1); }
function goPrevItem() { stepItem(-1); }
function stepItem(dir) {
  const items = [...document.querySelectorAll('#sideList .route-item')];
  if (!items.length || !activeItemEl) return;
  const idx = items.indexOf(activeItemEl);
  items[(idx + dir + items.length) % items.length].click();
}

/* ── BÚSQUEDA ────────────────────────────────────────────── */
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  searchClear.classList.toggle('visible', searchQuery.length > 0);
  if (searchQuery.length > 0 && activeItemEl) backToList();   // crítico en mobile
  renderList();
});
searchClear.addEventListener('click', () => {
  resetSearch(); searchInput.focus(); renderList();
});

/* ── COMPARTIR ───────────────────────────────────────────── */
function shareSitio(d) {
  try { localStorage.setItem(LS_SHARED + itemKey(d), '1'); } catch (e) {}
  const base = window.location.href.split('?')[0].split('#')[0];
  const url  = base + '?sitio=' + encodeURIComponent(slugify(d.nombre));
  const text = d.nombre + ' — Ushuaia, Tierra del Fuego';
  const full = text + '\n' + url;

  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.open('https://wa.me/?text=' + encodeURIComponent(full), '_blank');
    renderList(); renderDetail(d);
    return;
  }
  if (navigator.share) {
    navigator.share({ title: text, text: full, url })
      .then(() => { renderList(); renderDetail(d); }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(full)
      .then(() => { showToast('¡Link copiado al portapapeles!'); renderList(); renderDetail(d); })
      .catch(() => showToast('No se pudo copiar'));
  }
}

function showToast(msg) {
  let t = document.getElementById('share-toast');
  if (!t) { t = document.createElement('div'); t.id = 'share-toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.remove('visible'); void t.offsetWidth; t.classList.add('visible');
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


function stopSpeaking() {
  if (isSpeaking && window.speechSynthesis) { window.speechSynthesis.cancel(); isSpeaking = false; }
  document.querySelectorAll('.tts-btn').forEach(b => b.classList.remove('tts-playing'));
}

/* ── MODAL GOOGLE MAPS ───────────────────────────────────── */
function openMaps(nombre, src) {
  document.getElementById('mapsFrame').src = src;
  document.getElementById('mapsTitle').textContent = nombre + ' — Ushuaia';
  document.getElementById('mapsModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMaps(e) { if (e.target === document.getElementById('mapsModal')) closeMapsBtn(); }
function closeMapsBtn() {
  document.getElementById('mapsModal').classList.remove('open');
  document.getElementById('mapsFrame').src = '';
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMapsBtn(); });

/* ── ESTADO ABIERTO / CERRADO ────────────────────────────── */
/* Interpreta el texto de horarios (columna "HORARIO PF" del CSV). Formato, una línea por regla:
     Lunes a viernes de 10:00 a 19:00 horas.
     Sábados y domingos de 10:00 a 14:00 horas.
     Domingos y feriados CERRADO.
     Octubre a Marzo: Lunes a domingo de 9:00 a 20:00 horas.   (regla por temporada)
     Abierto las 24 horas.
   Siempre se calcula con la hora de Ushuaia, no la del dispositivo. */
const DIAS_ID = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_ID = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
let horarioTimer = null;
function clearHorarioTimer() { if (horarioTimer) { clearInterval(horarioTimer); horarioTimer = null; } }

function fechaUshuaia(ms) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, weekday: 'short', month: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
  }).formatToParts(new Date(ms));
  const get = t => (parts.find(p => p.type === t) || {}).value;
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { dow, mes: parseInt(get('month'), 10) - 1, min: (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10) };
}

function parseLineaHorario(raw) {
  const l = noAcc(raw);
  let meses = null;
  const mm = l.match(/\b([a-z]+)\s+a\s+([a-z]+)\s*:/);
  if (mm) {
    const a = MESES_ID.indexOf(mm[1]), b = MESES_ID.indexOf(mm[2]);
    if (a > -1 && b > -1) meses = [a, b];
  }
  const dn = DIAS_ID.join('|');
  const dias = new Set();
  const reRango = new RegExp('\\b(' + dn + ')s?\\s+a\\s+(' + dn + ')s?\\b', 'g');
  let m;
  while ((m = reRango.exec(l))) {
    const i = DIAS_ID.indexOf(m[1]), j = DIAS_ID.indexOf(m[2]);
    for (let k = i; ; k = (k + 1) % 7) { dias.add(k); if (k === j) break; }
  }
  const resto = l.replace(reRango, ' ');
  const reDia = new RegExp('\\b(' + dn + ')s?\\b', 'g');
  while ((m = reDia.exec(resto))) dias.add(DIAS_ID.indexOf(m[1]));
  if (!dias.size) for (let k = 0; k < 7; k++) dias.add(k);

  const rangos = [];
  const reH = /(\d{1,2}):(\d{2})\s*(?:a|-|–|hasta)\s*(\d{1,2}):(\d{2})/g;
  while ((m = reH.exec(l))) rangos.push({ desde: +m[1] * 60 + +m[2], hasta: +m[3] * 60 + +m[4] });
  if (!rangos.length) {
    const reH2 = /\b(\d{1,2})\s*(?:a|-|–)\s*(\d{1,2})\s*(?:hs|horas)/g;
    while ((m = reH2.exec(l))) rangos.push({ desde: +m[1] * 60, hasta: +m[2] * 60 });
  }
  return { meses, dias, rangos, cerrado: /cerrad/.test(l) };
}

function mesAplica(meses, mes) {
  if (!meses) return true;
  const [a, b] = meses;
  return a <= b ? (mes >= a && mes <= b) : (mes >= a || mes <= b);
}

function fmtMin(m) {
  const hh = Math.floor(m / 60), mi = m % 60;
  if (hh > 0 && mi > 0) return hh + ' h ' + mi + ' min';
  if (hh > 0) return hh + ' h';
  return mi + ' min';
}
function fmtHora(min) { return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }

/* Devuelve null si no se puede interpretar; si no, {tipo:'24h'} | {abierto, restante} | {abierto:false, abre:{enMin, dow, desde}|null} */
function calcularEstado(txt, ahoraMs) {
  if (/abierto\s+(las\s+)?24|24\s*(hs|horas)/i.test(txt)) return { tipo: '24h' };
  const reglas = txt.split('\n').map(s => s.trim()).filter(Boolean).map(parseLineaHorario);
  if (!reglas.some(r => r.rangos.length)) return null;

  const now = fechaUshuaia(ahoraMs);
  for (const r of reglas) {
    if (!r.dias.has(now.dow) || !mesAplica(r.meses, now.mes)) continue;
    for (const g of r.rangos) {
      if (now.min >= g.desde && now.min < g.hasta) return { abierto: true, restante: g.hasta - now.min };
    }
  }
  // próxima apertura (hasta 8 días hacia adelante)
  for (let off = 0; off <= 7; off++) {
    const f = off === 0 ? now : fechaUshuaia(ahoraMs + off * 86400000);
    let mejor = null;
    for (const r of reglas) {
      if (!r.dias.has(f.dow) || !mesAplica(r.meses, f.mes)) continue;
      for (const g of r.rangos) {
        if (off === 0 && g.desde <= now.min) continue;
        if (mejor === null || g.desde < mejor) mejor = g.desde;
      }
    }
    if (mejor !== null) return { abierto: false, abre: { enMin: off * 1440 - now.min + mejor, dow: f.dow, desde: mejor } };
  }
  return { abierto: false, abre: null };
}

function loadHorarioStatus(d) {
  clearHorarioTimer();
  if (!d.horario) return;
  const el = document.getElementById('hrstatus_' + slugify(d.nombre));
  if (!el) return;
  const nota = /feriado/i.test(d.horario) ? '<div class="hr-countdown hr-nota">Los feriados pueden variar: conviene confirmar antes de ir.</div>' : '';

  function render() {
    const s = calcularEstado(d.horario, Date.now());
    if (!s) { el.innerHTML = ''; return; }
    if (s.tipo === '24h') { el.innerHTML = '<span class="hr-abierto">🟢 ABIERTO · 24 hs</span>'; return; }
    if (s.abierto) {
      el.innerHTML = '<span class="hr-abierto">🟢 ABIERTO <span class="hr-countdown">· Cierra en ' + fmtMin(s.restante) + '</span></span>' + nota;
    } else if (s.abre) {
      const cuando = s.abre.enMin <= 24 * 60
        ? 'Abre en ' + fmtMin(s.abre.enMin)
        : 'Abre el ' + DIAS_ES[s.abre.dow] + ' a las ' + fmtHora(s.abre.desde);
      el.innerHTML = '<span class="hr-cerrado">🔴 CERRADO <span class="hr-countdown">· ' + cuando + '</span></span>' + nota;
    } else {
      el.innerHTML = '<span class="hr-cerrado">🔴 CERRADO</span>' + nota;
    }
  }
  render();
  horarioTimer = setInterval(render, 60000);
}

/* ── CLIMA Y LUZ (Open-Meteo, sin API key) ───────────────── */
const WMO = {
  0: ['☀️', 'Despejado'], 1: ['🌤️', 'Mayormente despejado'], 2: ['⛅', 'Parcialmente nublado'], 3: ['☁️', 'Nublado'],
  45: ['🌫️', 'Niebla'], 48: ['🌫️', 'Niebla con escarcha'],
  51: ['🌦️', 'Llovizna leve'], 53: ['🌦️', 'Llovizna'], 55: ['🌧️', 'Llovizna intensa'],
  56: ['🌧️', 'Llovizna helada'], 57: ['🌧️', 'Llovizna helada intensa'],
  61: ['🌧️', 'Lluvia leve'], 63: ['🌧️', 'Lluvia'], 65: ['🌧️', 'Lluvia fuerte'],
  66: ['🌧️', 'Lluvia helada'], 67: ['🌧️', 'Lluvia helada fuerte'],
  71: ['🌨️', 'Nevada leve'], 73: ['🌨️', 'Nevada'], 75: ['❄️', 'Nevada fuerte'], 77: ['🌨️', 'Granizo fino'],
  80: ['🌦️', 'Chubascos leves'], 81: ['🌧️', 'Chubascos'], 82: ['⛈️', 'Chubascos violentos'],
  85: ['🌨️', 'Chubascos de nieve'], 86: ['🌨️', 'Chubascos de nieve fuertes'],
  95: ['⛈️', 'Tormenta'], 96: ['⛈️', 'Tormenta con granizo'], 99: ['⛈️', 'Tormenta con granizo fuerte']
};
function wmo(code) { return WMO[code] || ['🌡️', '—']; }
function viento(deg) { return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(((deg % 360) + 360) % 360 / 45) % 8]; }
function uvInfo(uv) {
  if (uv == null) return ['—', ''];
  const v = Math.round(uv);
  if (v <= 2) return [v, 'Bajo'];
  if (v <= 5) return [v, 'Moderado'];
  if (v <= 7) return [v, 'Alto'];
  if (v <= 10) return [v, 'Muy alto'];
  return [v, 'Extremo'];
}
function hhmmDeISO(iso) { return String(iso || '').slice(11, 16); }
function duracionLuz(seg) { const m = Math.round(seg / 60); return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; }
function diaCorto(iso) {
  const [y, m, dd] = iso.split('-').map(Number);
  return ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][new Date(Date.UTC(y, m - 1, dd)).getUTCDay()];
}

function renderClima(j) {
  const c = j.current, dd = j.daily;
  const [ico, desc] = wmo(c.weather_code);
  const [uvN, uvT] = uvInfo(dd.uv_index_max && dd.uv_index_max[0]);
  const dias = dd.time.slice(0, 3).map((t, i) => {
    const [ic, ds] = wmo(dd.weather_code[i]);
    const pp = dd.precipitation_probability_max && dd.precipitation_probability_max[i];
    return '<div class="clima-day" title="' + h(ds) + '"><div class="clima-day-n">' + (i === 0 ? 'Hoy' : diaCorto(t)) + '</div>' +
      '<div class="clima-day-i">' + ic + '</div>' +
      '<div class="clima-day-t"><b>' + Math.round(dd.temperature_2m_max[i]) + '°</b> / ' + Math.round(dd.temperature_2m_min[i]) + '°</div>' +
      (pp != null ? '<div class="clima-day-p">💧 ' + pp + '%</div>' : '') + '</div>';
  }).join('');
  return '<div class="clima-now">' +
      '<div class="clima-ico">' + ico + '</div>' +
      '<div><div class="clima-temp">' + Math.round(c.temperature_2m) + '°C</div>' +
      '<div class="clima-desc">' + h(desc) + ' · sensación ' + Math.round(c.apparent_temperature) + '°</div></div>' +
    '</div>' +
    '<div class="clima-meta">' +
      '<span>💨 ' + viento(c.wind_direction_10m) + ' ' + Math.round(c.wind_speed_10m) + ' km/h' + (c.wind_gusts_10m ? ' (ráf. ' + Math.round(c.wind_gusts_10m) + ')' : '') + '</span>' +
      '<span>💧 Humedad ' + Math.round(c.relative_humidity_2m) + '%</span>' +
      '<span>🕶 UV máx. ' + uvN + (uvT ? ' · ' + uvT : '') + '</span>' +
    '</div>' +
    '<div class="clima-days">' + dias + '</div>' +
    '<div class="clima-sol">' +
      '<span>🌅 Amanece <b>' + hhmmDeISO(dd.sunrise[0]) + '</b></span>' +
      '<span>🌇 Atardece <b>' + hhmmDeISO(dd.sunset[0]) + '</b></span>' +
      '<span>☀️ Luz de día <b>' + duracionLuz(dd.daylight_duration[0]) + '</b></span>' +
    '</div>';
}

async function loadClima(d) {
  if (!hasCoords(d)) return;
  const id = 'clima_' + slugify(d.nombre);
  const el = document.getElementById(id);
  if (!el) return;
  const key = 'ush_clima_' + d.lat.toFixed(3) + '_' + d.lng.toFixed(3);
  try {
    const c = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (c && Date.now() - c.t < 15 * 60 * 1000) { el.innerHTML = renderClima(c.j); return; }
  } catch (e) {}
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + d.lat + '&longitude=' + d.lng +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,daylight_duration,uv_index_max' +
      '&timezone=' + encodeURIComponent(TZ) + '&forecast_days=3&wind_speed_unit=kmh';
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), j })); } catch (e) {}
    const now = document.getElementById(id);               // el usuario pudo cambiar de sitio mientras cargaba
    if (now) now.innerHTML = renderClima(j);
  } catch (e) {
    const now = document.getElementById(id);
    if (now) now.innerHTML = '<div class="clima-error">No se pudo cargar el clima (¿sin conexión?).</div>';
  }
}

/* ── DETALLE ─────────────────────────────────────────────── */
function checkGalleryEmpty(id) {
  const g = document.getElementById(id); if (!g) return;
  if ([...g.querySelectorAll('.photo-container')].every(c => c.style.display === 'none')) g.style.display = 'none';
}

function renderDetail(d) {
  currentDetail = d;
  const slug  = slugify(d.nombre);
  const color = (typeof TIPO_COLORS !== 'undefined' && TIPO_COLORS[d.tipo]) || '#7A3A18';
  const k = itemKey(d), isFav = !!getFavs()[k], isDone = !!getDones()[k];
  const coords = hasCoords(d);

  const ttsSvg =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' +
    '<path d="M19.07 4.93a10 10 0 0 1 0 14.14" class="tts-wave2"/></svg>';
  const chevron = dir => '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="' + (dir > 0 ? '9 18 15 12 9 6' : '15 18 9 12 15 6') + '"/></svg>';
  const pin = '<svg width="15" height="15" viewBox="0 0 48 48"><path d="M24 4C16.27 4 10 10.27 10 18c0 10.5 14 26 14 26s14-15.5 14-26c0-7.73-6.27-14-14-14z" fill="#EA4335"/><circle cx="24" cy="18" r="5" fill="#fff"/></svg>';

  function mapImgHtml() {
    if (!d.mapImg) return '';
    return '<div class="map-container" id="mapa_' + slug + '">' +
      '<img src="' + h(fileUrl('mapas', d.mapImg)) + '" alt="Mapa de ubicación de ' + h(d.nombre) + '" ' +
      'style="width:100%;height:auto;max-width:100%;max-height:70vh;object-fit:contain;display:block;" ' +
      'onload="this.nextElementSibling.style.display=\'none\'" onerror="this.parentElement.style.display=\'none\'"/>' +
      '<div class="map-placeholder"><div class="map-placeholder-icon">🗺</div><div class="map-placeholder-txt">Mapa de ' + h(d.nombre) + '</div></div></div>';
  }

  function fotoHtml(file, n) {
    return '<div class="photo-container" id="foto' + n + '_' + slug + '">' +
      '<img src="' + h(fileUrl('fotos', file)) + '" alt="' + h(d.nombre) + ' — foto ' + n + '" ' +
      'onload="this.nextElementSibling.style.display=\'none\'" ' +
      'onerror="this.parentElement.style.display=\'none\';checkGalleryEmpty(\'gallery_' + slug + '\')"/>' +
      '<div class="photo-placeholder"><div class="photo-placeholder-icon">📷</div><div class="photo-placeholder-txt">Foto ' + n + '</div></div></div>';
  }
  const fotos = [d.foto1, d.foto2].filter(Boolean);

  const liItems = [[d.liF1, d.liT1], [d.liF2, d.liT2], [d.liF3, d.liT3]].filter(x => x[0] || x[1]);

  elDetail.classList.remove('detail-enter'); void elDetail.offsetWidth; elDetail.classList.add('detail-enter');

  elDetail.innerHTML =
    '<div class="hero-accent-bar" style="background:' + color + '"></div>' +
    '<div class="hero-band">' +
      '<div class="hero-accent" style="color:' + color + '">' + h(tipoLabel(d.tipo)) + '</div>' +
      '<div class="hero-title-row"><div class="hero-title">' + h(d.nombre) + '</div>' +
        '<div class="hero-state-badges">' +
          (isFav  ? '<span class="state-badge fav-badge" title="Favorito">♥</span>' : '') +
          (isDone ? '<span class="state-badge done-badge" title="Visitado">✓</span>' : '') +
        '</div></div>' +
      '<div class="hero-loc">◈ Ushuaia · Tierra del Fuego</div>' +
      '<div class="hero-actions">' +
        '<button class="action-btn fav-btn' + (isFav ? ' active' : '') + '" onclick="toggleFav(currentDetail)">♥ <span class="action-label">Favorito</span></button>' +
        '<button class="action-btn done-btn' + (isDone ? ' active' : '') + '" onclick="toggleDone(currentDetail)">✓ <span class="action-label">Visitado</span></button>' +
        '<button class="action-btn share-btn" onclick="shareSitio(currentDetail)" title="Compartir">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
          '<span class="action-label">Compartir</span></button>' +
        '<button class="action-btn next-btn" onclick="goNextItem()" title="Siguiente sitio">' + chevron(1) + '<span class="action-label">Siguiente</span></button>' +
      '</div>' +
    '</div>' +

    // Descripción
    (d.obs ? '<div class="obs-block obs-above-map">' +
      '<div class="obs-title-row"><div class="sec-title"><span class="sec-title-icon">📝</span>Descripción</div>' +
        '<button class="tts-btn" onclick="speakObs(this.dataset.text,this)" title="Escuchar" data-text="' + h(d.obs.replace(/\n/g, ' ')) + '">' + ttsSvg + '<span class="tts-label">Escuchar</span></button>' +
      '</div>' +
      '<span class="obs-tag obs-info">' + nl2br(d.obs) + '</span></div>' : '') +

    // Horarios
    (d.horario ? '<div class="hr-block"><div class="sec-title"><span class="sec-title-icon">🕐</span>Horarios</div>' +
      '<div id="hrstatus_' + slug + '" class="hr-status"></div>' +
      '<p class="hr-txt hr-horario">' + nl2br(d.horario) + '</p></div>' : '') +

    // Mapa
    '<div class="map-section"><div class="sec-title"><span class="sec-title-icon">🗺</span>Ubicación</div>' +
      '<div class="map-btns-row">' +
        (d.mapSrc ? '<button class="gmaps-btn" onclick="openMaps(' + h(JSON.stringify(d.nombre)) + ',' + h(JSON.stringify(d.mapSrc)) + ')">' + pin + 'Ver en Google Maps</button>' : '') +
        (coords ? '<a class="llegar-btn" href="https://www.google.com/maps/dir/?api=1&destination=' + d.lat + ',' + d.lng + '" target="_blank" rel="noopener">🧭 Cómo llegar</a>' : '') +
      '</div>' + mapImgHtml() +
    '</div>' +

    // Galería
    (fotos.length ? '<div class="photos-section" id="gallery_' + slug + '"><div class="sec-title">Galería</div>' +
      '<div class="photos-pair' + (fotos.length === 1 ? ' single' : '') + '">' +
        fotos.map((f, i) => fotoHtml(f, i + 1)).join('') + '</div></div>' : '') +

    // Mejor época
    (d.epoca ? '<div class="info-block epoca-block"><div class="sec-title"><span class="sec-title-icon">🗓</span>Mejor época</div><p class="info-txt epoca-txt">' + nl2br(d.epoca) + '</p></div>' : '') +

    // Qué ver en el lugar
    (liItems.length ? '<div class="li-block"><div class="sec-title"><span class="sec-title-icon">📍</span>Qué ver en el lugar</div>' +
      liItems.map(([f, t]) =>
        '<div class="li-item' + (f ? ' map-container' : '') + '">' +
        (f ? '<img src="' + h(fileUrl('fotos', f)) + '" class="li-photo" alt="' + h(t || 'Para ver en el lugar') + '" onerror="this.closest(\'.li-item\').style.display=\'none\'"/>' : '') +
        (t ? '<p class="li-caption">' + h(t) + '</p>' : '') + '</div>').join('') + '</div>' : '') +

    // Clima y luz
    (coords ? '<div class="clima-block"><div class="sec-title"><span class="sec-title-icon">🌤</span>Clima y luz hoy</div>' +
      '<div id="clima_' + slug + '" class="clima-inner"><div class="clima-loading">🌤 Cargando clima…</div></div></div>' : '') +

    '<div class="nav-footer">' +
      '<button class="nav-foot-btn prev-foot-btn" onclick="goPrevItem()">' + chevron(-1).replace('width="14" height="14"', 'width="16" height="16"') + '<span>Anterior</span></button>' +
      '<button class="nav-foot-btn next-foot-btn" onclick="goNextItem()"><span>Siguiente</span>' + chevron(1).replace('width="14" height="14"', 'width="16" height="16"') + '</button>' +
    '</div>' +
    '<div class="detail-footer"></div>';

  loadHorarioStatus(d);
  loadClima(d);
}

function emptyState() {
  return '<div class="empty-state">' +
    '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" width="36" height="36" opacity="0.2">' +
      '<circle cx="60" cy="60" r="57" fill="#A0552A"/>' +
      '<polygon points="60,6 64,52 60,58 56,52" fill="#1A0A02"/><polygon points="60,114 64,68 60,62 56,68" fill="#1A0A02"/>' +
      '<polygon points="6,60 52,56 58,60 52,64" fill="#1A0A02"/><polygon points="114,60 68,56 62,60 68,64" fill="#1A0A02"/>' +
      '<polygon points="18,18 52,54 58,60 50,52" fill="#C07040"/><polygon points="102,18 68,54 62,60 70,52" fill="#C07040"/>' +
      '<polygon points="18,102 52,66 58,60 50,68" fill="#C07040"/><polygon points="102,102 68,66 62,60 70,68" fill="#C07040"/>' +
      '<circle cx="60" cy="60" r="14" fill="#7A3A18"/><circle cx="60" cy="60" r="5" fill="#D4956A"/></svg>' +
    '<div class="empty-txt">Seleccioná un sitio</div></div>';
}

/* ── INICIO ──────────────────────────────────────────────── */
renderList();

/* Deep link: ?sitio=museo_del_fin_del_mundo */
(function () {
  const slug = new URLSearchParams(window.location.search).get('sitio');
  if (!slug) return;
  const match = DATA.find(d => slugify(d.nombre) === slug);
  if (!match) return;
  const el = [...document.querySelectorAll('#sideList .route-item')]
    .find(x => x.dataset.nombre === match.nombre && x.dataset.tipo === match.tipo);
  history.replaceState({ base: true }, '');
  selectItem(match, el || null);
})();

// Estado base en el historial: el primer "atrás" no saca al usuario de la app
if (!history.state) history.replaceState({ base: true }, '');

/* ── BOTÓN ATRÁS ─────────────────────────────────────────── */
window.addEventListener('popstate', () => {
  if (mapaVisible) { toggleMapaView(true); return; }       // 1) cerrar mapa de la ciudad
  if (activeItemEl || currentDetail) {                      // 2) volver a la lista
    backToList();
    history.replaceState({ base: true }, '');
  }                                                          // 3) si no, el navegador sale de la app
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
    const mapImg = e.target.closest('.map-container img, .photo-container img');
    if (mapImg && mapImg.complete && mapImg.naturalWidth > 0) {
      open(mapImg.src);
    }
  });

})();



/* ── MAPA DE LA CIUDAD (Leaflet) ─────────────────────────── */
let mapaInstance = null;
let mapaVisible  = false;

function toggleMapaView(fromPopstate) {
  const btn   = document.getElementById('btnMapaView');
  const panel = document.getElementById('mapaIgnPanel');
  mapaVisible = !mapaVisible;
  if (mapaVisible) {
    panel.style.display = 'block';
    btn.classList.add('active');
    panel.style.top = (document.querySelector('.header').offsetHeight + document.querySelector('.toolbar').offsetHeight) + 'px';
    initMapa();
    if (!fromPopstate) history.pushState({ mapa: true }, '');
  } else {
    panel.style.display = 'none';
    btn.classList.remove('active');
  }
}

function initMapa() {
  const cont = document.getElementById('mapaIgn');
  if (typeof L === 'undefined') {
    cont.innerHTML = '<div class="no-results"><div class="no-results-icon">📡</div><div class="no-results-txt">El mapa necesita conexión a internet</div></div>';
    return;
  }
  if (mapaInstance) { mapaInstance.invalidateSize(); centrarMapaEnSitioActual(); return; }

  mapaInstance = L.map('mapaIgn', { center: CENTRO_MAPA, zoom: 13, zoomControl: true });
  const ign = L.tileLayer('https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG%3A3857@png/{z}/{x}/{-y}.png', {
    attribution: '<a href="https://www.ign.gob.ar" target="_blank">IGN Argentina</a> + <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a>',
    minZoom: 3, maxZoom: 18
  });
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    minZoom: 3, maxZoom: 19
  });
  ign.addTo(mapaInstance);
  L.control.layers({ 'IGN': ign, 'OpenStreetMap': osm }, null, { position: 'topright' }).addTo(mapaInstance);

  const puntos = [];
  DATA.forEach(d => {
    if (d.hidden || !hasCoords(d)) return;
    const color = (typeof TIPO_COLORS !== 'undefined' && TIPO_COLORS[d.tipo]) || '#7A3A18';
    const icon = L.divIcon({
      className: '', html: '<div class="ign-marker-icon" style="background:' + color + ';"></div>',
      iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -12]
    });
    const marker = L.marker([d.lat, d.lng], { icon }).addTo(mapaInstance);
    const pop = document.createElement('div');
    pop.innerHTML =
      '<div class="ign-popup-tipo" style="color:' + color + '">' + h(tipoLabel(d.tipo)) + '</div>' +
      '<div class="ign-popup-nombre">' + h(d.nombre) + '</div>' +
      '<button class="ign-popup-btn">Ver detalle →</button>';
    pop.querySelector('button').addEventListener('click', () => seleccionarDesdeMapa(d));
    marker.bindPopup(pop, { maxWidth: 200, minWidth: 160 });
    puntos.push([d.lat, d.lng]);
  });

  if (puntos.length > 1) mapaInstance.fitBounds(puntos, { padding: [40, 40], maxZoom: 15 });
  else if (puntos.length === 1) mapaInstance.setView(puntos[0], 15);
  centrarMapaEnSitioActual();
}

function centrarMapaEnSitioActual() {
  if (!mapaInstance || !currentDetail || !hasCoords(currentDetail)) return;
  mapaInstance.setView([currentDetail.lat, currentDetail.lng], 16);
  mapaInstance.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      const ll = layer.getLatLng();
      if (Math.abs(ll.lat - currentDetail.lat) < 1e-6 && Math.abs(ll.lng - currentDetail.lng) < 1e-6) layer.openPopup();
    }
  });
}

function seleccionarDesdeMapa(d) {
  toggleMapaView();
  const el = [...document.querySelectorAll('#sideList .route-item')]
    .find(x => x.dataset.nombre === d.nombre && x.dataset.tipo === d.tipo);
  if (el) { selectItem(d, el); el.scrollIntoView({ block: 'center' }); }
  else {                                   // el sitio está filtrado fuera de la lista: limpiar filtros
    activeFilter = 'TODOS';
    document.querySelectorAll('.filter-special').forEach(b => b.classList.remove('active'));
    resetSearch(); renderList();
    const el2 = [...document.querySelectorAll('#sideList .route-item')]
      .find(x => x.dataset.nombre === d.nombre && x.dataset.tipo === d.tipo);
    selectItem(d, el2 || null);
  }
}
