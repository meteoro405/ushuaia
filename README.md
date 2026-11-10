# Ushuaia cuenta su historia

Guía web (PWA) de puntos de interés de la ciudad de Ushuaia. Es la versión reducida de **De Cuestas, Abras y Quebradas**: mismo estilo y misma base técnica (HTML/CSS/JS puro, sin frameworks ni build), pero con 10–20 sitios de una sola ciudad en lugar de rutas de todo el país.

Cada sitio muestra: descripción (con lectura en voz alta), **audioguía en mp3**, **código QR**, **horarios con semáforo Abierto/Cerrado** (hora de Ushuaia), ubicación en Google Maps + «Cómo llegar», galería, mejor época, qué ver en el lugar y **clima y horas de luz de hoy**. Además: favoritos, visitados, compartir por link, mapa con todos los sitios y funcionamiento offline.

## Estructura del repo

```
index.html        página principal
style.css         estilos
app.js            lógica de la app
data.js           los sitios (GENERADO desde el CSV — no se edita a mano)
sw.js             service worker (offline)
manifest.json     datos de instalación como app
favicon.png, pwa_icon_192.png, pwa_icon_512.png   íconos de la app (pingüino)
pinguino.svg      dibujo original del pingüino (de acá salen los íconos)
README_COLORES.md paleta de colores en HEX y RGB
fotos/            fotos de los sitios
mapas/            imágenes de ubicación de cada sitio
audioguia/
  audios/         audioguías en mp3 (columna ARCHIVO AUDIO)
  QR/             imágenes de los códigos QR (columna CODIGO QR)
datos/
  Ushuaia.csv     la base de datos (se edita en Excel)
  gen_datajs.py   convierte el CSV en data.js
```

## Cómo agregar o modificar un sitio

1. Editá `datos/Ushuaia.csv` (Excel, guardar como **CSV delimitado por punto y coma**).
2. Copiá las fotos a `fotos/`, las imágenes de mapa a `mapas/`, los mp3 a `audioguia/audios/` y los QR a `audioguia/QR/` con **exactamente** el nombre que pusiste en el CSV (mayúsculas y minúsculas importan en GitHub Pages).
3. Desde la raíz del repo ejecutá: `python datos/gen_datajs.py` — regenera `data.js` y te avisa si falta alguna foto o coordenada.
4. Subí los cambios a GitHub.
5. Si cambiaste código (`app.js`, `style.css`, etc.), subí el número de versión en `sw.js` (`sitios-ushuaia-v1` → `v2`). Para cambios solo de datos y fotos no hace falta: `data.js` se actualiza solo cuando hay conexión.

## Columnas del CSV

| Columna | Qué va |
|---|---|
| `A` | se ignora |
| `LUGAR DE INTERES` | categoría (por ahora todas iguales) |
| `NOMBRE` | **obligatoria**; una fila sin nombre se ignora |
| `OBSERVACIONES` | descripción; un salto de línea (Alt+Enter) separa párrafos |
| `CODIGO HTML GOOGLE MAPS` | el `<iframe …>` de Google Maps → Compartir → Insertar un mapa. De ahí salen las coordenadas (clima, «Cómo llegar», mapa) |
| `FOTO 1`, `FOTO 2` | archivos en `fotos/` (con una sola foto, se muestra a todo el ancho) |
| `CONTENEDOR DEL MAPA` | imagen en `mapas/` |
| `MEJOR EPOCA` | texto libre |
| `LUGAR_INTERES_FOTO_1..3` | fotos en `fotos/` de cosas para ver en el lugar *(en el CSV actual falta la columna `_FOTO_1`; si la necesitás, agregala con ese nombre)* |
| `TEXTO_INTERES_FOTO_1..3` | pie de cada una de esas fotos |
| `HORARIO PF` | horarios (también se aceptan los encabezados `HORARIO` y `HORARIOS`) |
| `ARCHIVO AUDIO` | nombre del mp3 en `audioguia/audios/`; si hay archivo, aparece el reproductor «Audioguía» en la ficha |
| `CODIGO QR` | nombre de la imagen del QR en `audioguia/QR/`; aparece en la ficha, se puede ampliar y descargar |

### Formato de horarios (una regla por línea)

```
Lunes a viernes de 10:00 a 19:00 horas.
Sábados de 13:00 a 19:00 horas.
Domingos y feriados CERRADO.
```
Con temporadas: `Octubre a Marzo: Lunes a domingo de 9:00 a 20:00 horas.` · Siempre abierto: `Abierto las 24 horas.`
Si el texto no se puede interpretar, igual se muestra tal cual, solo que sin el semáforo. La app no conoce los feriados: lo avisa debajo del semáforo cuando el texto menciona feriados.

## Publicar en GitHub Pages

1. Creá un repositorio nuevo (sugerido: `sitios-ushuaia`) y subí **todo** el contenido de esta carpeta.
2. Settings → Pages → *Deploy from a branch* → rama `main`, carpeta `/ (root)`.
3. En un minuto queda en `https://<usuario>.github.io/sitios-ushuaia/`.

## Qué se sacó respecto de De Cuestas, Abras y Quebradas

Todo lo pensado para rutas de largo recorrido: filtros por provincia/tipo, dificultad, superficie y altitud, perfil altimétrico GPX, parques nacionales, pasos fronterizos, aeropuertos/METAR, incendios (NASA FIRMS), sismos, mareas, lugares cercanos (OSM), widget de clima de terceros, apps hermanas (distancias, CAVOK, conversor), botón de donación y Google Tag Manager.

Se conservó y adaptó: favoritos/visitados, compartir, lectura en voz alta, visor de fotos con zoom, mapa (IGN + OpenStreetMap), instalación PWA y modo offline.

Los favoritos y visitados se guardan con claves propias (`ush_*`) para no mezclarse con los de otras apps publicadas bajo el mismo `github.io`.

## Audioguías y modo offline

El reproductor usa el `<audio>` del navegador. La primera vez que se reproduce un mp3 con internet, la app lo guarda en segundo plano y desde entonces suena también sin conexión. Si un mp3 se reemplaza por otro con el **mismo nombre**, subí la versión de `sw.js` (`sitios-ushuaia-v2` → `v3`) para que los celulares descarguen el nuevo. Lo más simple es usar un nombre nuevo cuando cambie el audio.

## Importante: nombres de archivo

GitHub Pages distingue **mayúsculas de minúsculas**: la carpeta es `audioguia/QR` (en mayúsculas) y `audioguia/audios` (en minúsculas), y el nombre del archivo en el repo tiene que ser idéntico al de la celda del CSV. Evitá tildes y espacios en los nombres de archivo (`QR-01-Plaza-Civica.png`, no `QR-01-Plaza-Cívica.png`): según el sistema donde se creó el archivo, la tilde puede guardarse con otra codificación y el navegador no lo encuentra. Si una imagen o un audio no aparece, abrí la consola del navegador (F12): la app deja escrito el archivo que no encontró.

## Colores e íconos

La paleta es azul / celeste / blanco; el detalle en HEX y RGB está en `README_COLORES.md`. El ícono (cabecera y app instalada) es el pingüino de `pinguino.svg`. Si cambiás el dibujo, hay que volver a generar `pwa_icon_192.png`, `pwa_icon_512.png` y `favicon.png`, y subir la versión de `sw.js`.
