#!/usr/bin/env python3
"""
gen_datajs.py — Convierte datos/Ushuaia.csv en data.js (la "base de datos" de la app).

Uso (desde la raíz del repo o desde datos/):
    python datos/gen_datajs.py
    python gen_datajs.py            # si estás dentro de datos/

Lee   : Ushuaia.csv (en datos/ o en la raíz del repo; separador ;  — acepta UTF-8 o Windows-1252/Excel)
Escribe: data.js            (en la raíz del repo)

Columnas reconocidas (por NOMBRE de encabezado; el orden no importa):
  LUGAR DE INTERES        -> tipo / categoría que se muestra en la lista
  NOMBRE                  -> nombre del sitio (obligatoria; fila sin nombre = se ignora)
  OBSERVACIONES           -> descripción principal
  CODIGO HTML GOOGLE MAPS -> el <iframe ...> de "Compartir > Insertar un mapa" (de ahí salen lat/lng)
  FOTO 1 / FOTO 2         -> archivos dentro de fotos/
  CONTENEDOR DEL MAPA     -> imagen dentro de mapas/
  MEJOR EPOCA             -> texto libre
  LUGAR_INTERES_FOTO_1..3 -> fotos (en fotos/) de cosas para ver en el lugar
  TEXTO_INTERES_FOTO_1..3 -> pie de cada una de esas fotos
  HORARIO PF              -> horarios (ver formato en el README). Alias aceptados: HORARIO, HORARIOS
  ARCHIVO AUDIO           -> mp3 de la audioguía, dentro de audioguia/audios/
  CODIGO QR               -> imagen del QR del sitio, dentro de audioguia/QR/
COLUMNA A (visibilidad): si la celda contiene el carácter "ü" (la tilde de Wingdings), la estación SE MUESTRA;
si está en blanco, NO se muestra: queda fuera de la lista, del buscador, del mapa y de los links de la app, pero
la fila y todos sus archivos (html, mp3, fotos, QR…) siguen existiendo. Para mostrarla de nuevo, volvé a poner "ü".
(Si el CSV no tiene columna A, se muestran todas las estaciones.)
"""
import csv, io, json, re, sys, html
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent if AQUI.name == 'datos' else AQUI
CSV_PATH = next((c for c in (AQUI / 'Ushuaia.csv', RAIZ / 'Ushuaia.csv', RAIZ / 'datos' / 'Ushuaia.csv') if c.exists()),
                AQUI / 'Ushuaia.csv')   # busca el CSV junto al script, en la raíz del repo o en datos/
OUT_PATH = RAIZ / 'data.js'

def leer_csv(path):
    raw = path.read_bytes()
    for enc in ('utf-8-sig', 'cp1252', 'latin-1'):
        try:
            txt = raw.decode(enc); break
        except UnicodeDecodeError:
            continue
    delim = ';' if txt.count(';') >= txt.count(',') else ','
    return list(csv.reader(io.StringIO(txt, newline=''), delimiter=delim)), enc

def norm(h):
    return re.sub(r'\s+', ' ', h.strip().upper().replace('_', ' '))

def limpiar(s):
    s = (s or '').replace('\r\n', '\n').replace('\r', '\n').replace('\u00a0', ' ')
    s = '\n'.join(re.sub(r'[ \t]+', ' ', l).strip() for l in s.split('\n'))
    return s.strip()

def arreglar_horario(s):
    s = limpiar(s)
    s = re.sub(r'(\d{1,2}:\d{2})\s*\?\s*(horas?|hs)', r'\1 \2', s, flags=re.I)   # "19:00?horas" -> "19:00 horas"
    s = re.sub(r'(\d{1,2}):(?!\d)\s*(horas?|hs)', r'\1:00 \2', s, flags=re.I)    # "19: horas"   -> "19:00 horas"
    return s

def coords(iframe):
    m = re.search(r'!2d(-?\d+\.?\d*)!3d(-?\d+\.?\d*)', iframe)
    if m: return float(m.group(2)), float(m.group(1))
    m = re.search(r'!3d(-?\d+\.?\d*)!2d(-?\d+\.?\d*)', iframe)
    if m: return float(m.group(1)), float(m.group(2))
    m = re.search(r'[?&;]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)', iframe)
    if m: return float(m.group(1)), float(m.group(2))
    return None, None

def src_de_iframe(code):
    m = re.search(r'src\s*=\s*"([^"]+)"', code) or re.search(r"src\s*=\s*'([^']+)'", code)
    if m: return html.unescape(m.group(1))
    return code.strip() if code.strip().startswith('http') else ''

def main():
    if not CSV_PATH.exists():
        sys.exit(f'No encuentro {CSV_PATH}')
    rows, enc = leer_csv(CSV_PATH)
    hdr = [norm(h) for h in rows[0]]
    def col(row, *names):
        for n in names:
            n = norm(n)
            if n in hdr:
                i = hdr.index(n)
                if i < len(row): return row[i]
        return ''

    data, avisos, ocultas = [], [], []
    tiene_visibilidad = 'A' in hdr
    for nro, r in enumerate(rows[1:], start=2):
        nombre = limpiar(col(r, 'NOMBRE'))
        if not nombre:
            continue
        if tiene_visibilidad and not any(ch in col(r, 'A') for ch in ('ü', 'Ü')):
            ocultas.append(nombre)          # columna A en blanco -> no se publica en data.js
            continue
        iframe = col(r, 'CODIGO HTML GOOGLE MAPS')
        lat, lng = coords(iframe)
        d = {
            'tipo':    limpiar(col(r, 'LUGAR DE INTERES', 'TIPO')).upper() or 'LUGAR DE INTERES',
            'nombre':  nombre,
            'obs':     limpiar(col(r, 'OBSERVACIONES')),
            'mapSrc':  src_de_iframe(iframe),
            'lat':     lat, 'lng': lng,
            'foto1':   limpiar(col(r, 'FOTO 1')),
            'foto2':   limpiar(col(r, 'FOTO 2')),
            'mapImg':  limpiar(col(r, 'CONTENEDOR DEL MAPA')),
            'epoca':   limpiar(col(r, 'MEJOR EPOCA')),
            'liF1':    limpiar(col(r, 'LUGAR_INTERES_FOTO_1')),
            'liF2':    limpiar(col(r, 'LUGAR_INTERES_FOTO_2')),
            'liF3':    limpiar(col(r, 'LUGAR_INTERES_FOTO_3')),
            'liT1':    limpiar(col(r, 'TEXTO_INTERES_FOTO_1')),
            'liT2':    limpiar(col(r, 'TEXTO_INTERES_FOTO_2')),
            'liT3':    limpiar(col(r, 'TEXTO_INTERES_FOTO_3')),
            'horario': arreglar_horario(col(r, 'HORARIO PF', 'HORARIO', 'HORARIOS')),
            'audio':   limpiar(col(r, 'ARCHIVO AUDIO')),
            'qr':      limpiar(col(r, 'CODIGO QR')),
        }
        d = {k: v for k, v in d.items() if v not in ('', None)}
        if 'lat' not in d: avisos.append(f'fila {nro} «{nombre}»: no pude sacar lat/lng del código de Google Maps (no saldrá en el mapa ni tendrá clima)')
        if 'obs' not in d: avisos.append(f'fila {nro} «{nombre}»: sin OBSERVACIONES')
        for campo, carpeta in (('foto1','fotos'),('foto2','fotos'),('liF1','fotos'),('liF2','fotos'),('liF3','fotos'),('mapImg','mapas'),
                               ('audio','audioguia/audios'),('qr','audioguia/QR')):
            f = d.get(campo)
            if f and not (RAIZ / carpeta / f).exists():
                avisos.append(f'fila {nro} «{nombre}»: falta {carpeta}/{f}')
        data.append(d)

    js = ('/* data.js — GENERADO por datos/gen_datajs.py desde datos/Ushuaia.csv. No editar a mano. */\n'
          'const DATA = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n\n'
          '/* Color de acento por categoría (la categoría viene de la columna "LUGAR DE INTERES").\n'
          '   Si agregás una categoría nueva en el CSV, sumale un color acá (si no, usa el marrón por defecto). */\n'
          'const TIPO_COLORS = {\n  "LUGAR DE INTERES": "#1F5A8F"\n};\n')
    OUT_PATH.write_text(js, encoding='utf-8')
    print(f'OK: {len(data)} estación(es) visibles -> {OUT_PATH.name}   (CSV leído como {enc})')
    if ocultas:
        print(f'  Ocultas (columna A en blanco): {len(ocultas)} -> ' + '; '.join(ocultas))
    for a in avisos: print('  ⚠', a)

if __name__ == '__main__':
    main()
