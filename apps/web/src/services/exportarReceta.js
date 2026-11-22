/**
 * Exportación de recetas sin dependencias (Fase 5 — solicitud del cliente).
 *
 * Rediseño visual (petición del cliente): **tonos tierra** (esmeralda +
 * ámbar sobre papel crema) y estética **Liquid Glass** — tarjeta de vidrio
 * con sombra suave, foto con marco claro, chips de meta e ingredientes y
 * pasos con numeración.
 *
 * - `descargarImagenReceta`: tarjeta PNG dibujada en <canvas>.
 * - `imprimirReceta`: vista imprimible con el mismo lenguaje visual; el
 *   diálogo nativo del navegador ofrece "Guardar como PDF".
 *
 * Ambos aceptan la receta normalizada de RecetaDetalle.jsx
 * ({ titulo, descripcion, imagen, ingredientes, pasos, tiempo, ... }).
 */

const DIFICULTADES = { facil: 'Fácil', media: 'Media', dificil: 'Difícil' };

/** Tipografía del lienzo (system-ui resuelve a Segoe UI en Windows). */
const FUENTE = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/* ── Paleta de marca: tonos tierra ── */
const T = {
  crema: '#fbf7f0',
  esmeralda: '#047857',
  esmeraldaOsc: '#065f46',
  esmeraldaViva: '#10b981',
  esmeraldaNube: '#e6f6ef',
  ambar: '#b45309',
  ambarVivo: '#f59e0b',
  ambarNube: '#fdf1de',
  tinta: '#2f2a22',
  cuerpo: '#4a4237',
  tenue: '#8a7c68',
  linea: '#e8dfcd',
  vidrio: 'rgba(255,255,255,0.74)',
  vidrioBorde: 'rgba(255,255,255,0.95)',
};

/** Alto de la barra de marca superior. */
const BARRA = 116;

/** Escapa HTML para contenido inyectado en el diálogo de compartir. */
export function escaparHtml(texto) {
  return String(texto ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c,
  );
}

/** Nombre de archivo seguro a partir del título. */
function slug(titulo) {
  return (
    String(titulo || 'receta')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'receta'
  );
}

/** Parte un texto en líneas que caben en el ancho dado (ctx.measureText). */
function partirLineas(ctx, texto, anchoMax) {
  const palabras = String(texto || '')
    .split(/\s+/)
    .filter(Boolean);
  const lineas = [];
  let actual = '';
  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > anchoMax && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [''];
}

/** Traza un rectángulo redondeado sin cerrar el relleno. */
function rutaRedonda(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Carga la imagen de la receta (CORS anónimo para no contaminar el canvas). */
function cargarImagen(src) {
  return new Promise((resolver) => {
    if (!src) return resolver(null);
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolver(img);
    img.onerror = () => resolver(null);
    img.src = src;
  });
}

/* ─────────────────────────── Marca de la casa ─────────────────────────── */

/**
 * Olla con vapor sobre base de ámbar (la marca de SazónLab), dibujada con
 * rutas del propio lienzo: sin red, sin CORS y sin riesgo de contaminarlo.
 * Dibuja en una caja de 64×64 escalada a `tam`.
 */
function dibujarMarca(ctx, x, y, tam) {
  const e = tam / 64;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(e, e);

  // Base redondeada con degradado tierra
  const base = ctx.createLinearGradient(0, 0, 64, 64);
  base.addColorStop(0, '#fcd34d');
  base.addColorStop(0.5, '#f59e0b');
  base.addColorStop(1, '#c2410c');
  ctx.fillStyle = base;
  rutaRedonda(ctx, 0, 0, 64, 64, 18);
  ctx.fill();

  // Borde de cristal
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  rutaRedonda(ctx, 3, 3, 58, 58, 15);
  ctx.stroke();

  // Vapor
  ctx.strokeStyle = '#fff7ed';
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  [
    [24, 0.95],
    [32, 0.85],
    [40, 0.95],
  ].forEach(([cx, alfa]) => {
    ctx.globalAlpha = alfa;
    ctx.beginPath();
    ctx.moveTo(cx, 27);
    ctx.bezierCurveTo(cx - 5, 21, cx + 5, 17, cx - 1, 10);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // Olla: cuerpo, tapa, knob y asas
  ctx.fillStyle = '#fff7ed';
  ctx.beginPath();
  ctx.moveTo(22, 37);
  ctx.lineTo(42, 37);
  ctx.lineTo(39.5, 50);
  ctx.quadraticCurveTo(38.5, 54, 35, 54);
  ctx.lineTo(29, 54);
  ctx.quadraticCurveTo(25.5, 54, 24.5, 50);
  ctx.closePath();
  ctx.fill();
  rutaRedonda(ctx, 20, 33, 24, 4.6, 2.3);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(32, 31.4, 3, Math.PI, 0);
  ctx.fill();
  rutaRedonda(ctx, 15, 38, 7, 4.6, 2.3);
  ctx.fill();
  rutaRedonda(ctx, 42, 38, 7, 4.6, 2.3);
  ctx.fill();

  ctx.restore();
}

/* ─────────────────────────── Capas de la tarjeta ─────────────────────────── */

/** Fondo: papel crema, destellos tierra y barra de marca. */
function dibujarFondo(ctx, ancho, alto) {
  ctx.fillStyle = T.crema;
  ctx.fillRect(0, 0, ancho, alto);

  const verde = ctx.createRadialGradient(
    ancho * 0.1,
    alto * 0.08,
    0,
    ancho * 0.1,
    alto * 0.08,
    ancho * 0.9,
  );
  verde.addColorStop(0, 'rgba(16,185,129,0.22)');
  verde.addColorStop(1, 'rgba(16,185,129,0)');
  ctx.fillStyle = verde;
  ctx.fillRect(0, 0, ancho, alto);

  const ambar = ctx.createRadialGradient(
    ancho * 0.94,
    alto * 0.92,
    0,
    ancho * 0.94,
    alto * 0.92,
    ancho * 0.95,
  );
  ambar.addColorStop(0, 'rgba(245,158,11,0.26)');
  ambar.addColorStop(1, 'rgba(245,158,11,0)');
  ctx.fillStyle = ambar;
  ctx.fillRect(0, 0, ancho, alto);

  // Barra de marca: ámbar → esmeralda
  const barra = ctx.createLinearGradient(0, 0, ancho, 0);
  barra.addColorStop(0, '#b45309');
  barra.addColorStop(0.5, '#d97706');
  barra.addColorStop(1, '#047857');
  ctx.fillStyle = barra;
  ctx.fillRect(0, 0, ancho, BARRA);

  const brillo = ctx.createLinearGradient(0, 0, 0, BARRA);
  brillo.addColorStop(0, 'rgba(255,255,255,0.3)');
  brillo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 0, ancho, BARRA);

  const marca = 64;
  dibujarMarca(ctx, 48, (BARRA - marca) / 2, marca);

  const tx = 48 + marca + 22;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 30px ${FUENTE}`;
  ctx.fillText('SAZÓNLAB', tx, BARRA / 2 - 15);
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = `500 22px ${FUENTE}`;
  ctx.fillText('RECETARIO INTELIGENTE', tx, BARRA / 2 + 18);
  ctx.textBaseline = 'top';
}

/** Tarjeta de vidrio (Liquid Glass) situada detrás del contenido. */
function dibujarPanel(ctx, x, y, w, h) {
  ctx.save();
  ctx.shadowColor = 'rgba(70,52,26,0.16)';
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = T.vidrio;
  rutaRedonda(ctx, x, y, w, h, 36);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = T.vidrioBorde;
  ctx.lineWidth = 2.5;
  rutaRedonda(ctx, x, y, w, h, 36);
  ctx.stroke();
}

/** Título de sección en ámbar con subrayado esmeralda. Devuelve la y libre. */
function tituloSeccion(ctx, texto, x, y) {
  ctx.textBaseline = 'top';
  ctx.font = `800 32px ${FUENTE}`;
  ctx.fillStyle = T.ambar;
  ctx.fillText(texto, x, y);
  const ancho = Math.min(76, ctx.measureText(texto).width);
  ctx.fillStyle = T.esmeraldaViva;
  rutaRedonda(ctx, x, y + 46, ancho, 6, 3);
  ctx.fill();
  return y + 74;
}

/* ─────────────────────────── Contenido ─────────────────────────── */

/**
 * Dibuja el contenido de la receta y devuelve la y en la que termina.
 * Se dibuja sobre un lienzo transparente: después se colocan detrás la
 * tarjeta de vidrio y el fondo (ver `dibujarTarjeta`).
 */
function dibujarContenido(ctx, receta, foto, geo) {
  const { x, util } = geo;
  let y = geo.y;
  ctx.textBaseline = 'top';

  // Título
  ctx.fillStyle = T.tinta;
  ctx.font = `800 54px ${FUENTE}`;
  for (const linea of partirLineas(ctx, receta.titulo || 'Sin título', util)) {
    ctx.fillText(linea, x, y);
    y += 68;
  }
  y += 24;

  // Chips de meta (tiempo · dificultad · porciones)
  const chips = [];
  if (receta.tiempo) chips.push({ txt: `${receta.tiempo} min`, ambar: false });
  if (receta.dificultad) {
    chips.push({ txt: DIFICULTADES[receta.dificultad] || receta.dificultad, ambar: true });
  }
  if (receta.porciones) chips.push({ txt: `${receta.porciones} porciones`, ambar: false });
  if (chips.length) {
    ctx.font = `600 26px ${FUENTE}`;
    ctx.textBaseline = 'middle';
    let cx = x;
    const altoChip = 54;
    for (const chip of chips) {
      const w = Math.ceil(ctx.measureText(chip.txt).width) + 44;
      ctx.fillStyle = chip.ambar ? T.ambarNube : T.esmeraldaNube;
      rutaRedonda(ctx, cx, y, w, altoChip, 27);
      ctx.fill();
      ctx.strokeStyle = chip.ambar ? 'rgba(180,83,9,0.28)' : 'rgba(4,120,87,0.28)';
      ctx.lineWidth = 1.5;
      rutaRedonda(ctx, cx, y, w, altoChip, 27);
      ctx.stroke();
      ctx.fillStyle = chip.ambar ? T.ambar : T.esmeraldaOsc;
      ctx.fillText(chip.txt, cx + 22, y + altoChip / 2 + 1);
      cx += w + 14;
    }
    ctx.textBaseline = 'top';
    y += altoChip + 40;
  }

  // Foto con marco de cristal
  if (foto && foto.width > 0 && foto.height > 0) {
    const altoFoto = 420;
    const r = 26;
    ctx.save();
    ctx.shadowColor = 'rgba(60,45,20,0.2)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#ffffff';
    rutaRedonda(ctx, x - 9, y - 9, util + 18, altoFoto + 18, r + 9);
    ctx.fill();
    ctx.restore();

    const escala = Math.max(util / foto.width, altoFoto / foto.height);
    const dw = foto.width * escala;
    const dh = foto.height * escala;
    ctx.save();
    rutaRedonda(ctx, x, y, util, altoFoto, r);
    ctx.clip();
    ctx.drawImage(foto, x + (util - dw) / 2, y + (altoFoto - dh) / 2, dw, dh);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    rutaRedonda(ctx, x, y, util, altoFoto, r);
    ctx.stroke();

    y += altoFoto + 46;
  }

  // Descripción
  if (receta.descripcion) {
    ctx.fillStyle = T.cuerpo;
    ctx.font = `400 30px ${FUENTE}`;
    for (const linea of partirLineas(ctx, receta.descripcion, util)) {
      ctx.fillText(linea, x, y);
      y += 44;
    }
    y += 36;
  }

  // Ingredientes
  y = tituloSeccion(ctx, 'Ingredientes', x, y);
  ctx.font = `400 30px ${FUENTE}`;
  ctx.textBaseline = 'top';
  for (const ing of receta.ingredientes || []) {
    const texto = `${ing.nombre}${ing.cantidad ? ` — ${ing.cantidad}` : ''}`;
    const lineas = partirLineas(ctx, texto, util - 34);
    ctx.fillStyle = T.esmeraldaViva;
    ctx.beginPath();
    ctx.arc(x + 8, y + 19, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = T.cuerpo;
    for (const linea of lineas) {
      ctx.fillText(linea, x + 34, y);
      y += 44;
    }
    y += 10;
  }
  if (!(receta.ingredientes || []).length) {
    ctx.fillStyle = T.tenue;
    ctx.fillText('Sin ingredientes registrados', x, y);
    y += 50;
  }
  y += 40;

  // Preparación
  y = tituloSeccion(ctx, 'Preparación', x, y);
  ctx.textBaseline = 'top';
  (receta.pasos || []).forEach((paso, i) => {
    ctx.font = `400 30px ${FUENTE}`;
    const lineas = partirLineas(ctx, paso, util - 66);
    const lado = 40;

    // Numeración en píldora esmeralda
    const grad = ctx.createLinearGradient(x, y, x + lado, y + lado);
    grad.addColorStop(0, T.esmeraldaViva);
    grad.addColorStop(1, T.esmeralda);
    ctx.fillStyle = grad;
    rutaRedonda(ctx, x, y + 2, lado, lado, 13);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 23px ${FUENTE}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), x + lado / 2, y + 2 + lado / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.font = `400 30px ${FUENTE}`;
    ctx.fillStyle = T.cuerpo;
    for (const linea of lineas) {
      ctx.fillText(linea, x + 66, y);
      y += 44;
    }
    y += 18;
  });
  if (!(receta.pasos || []).length) {
    ctx.fillStyle = T.tenue;
    ctx.font = `400 30px ${FUENTE}`;
    ctx.fillText('Sin pasos de preparación', x, y);
    y += 50;
  }

  // Pie
  y += 30;
  ctx.fillStyle = T.linea;
  rutaRedonda(ctx, x, y, util, 2, 1);
  ctx.fill();
  y += 28;
  ctx.textBaseline = 'top';
  ctx.font = `500 26px ${FUENTE}`;
  ctx.fillStyle = T.tenue;
  ctx.fillText(`Receta de SazónLab · ${new Date().toLocaleDateString('es-ES')}`, x, y);
  y += 46;

  return y;
}

/**
 * Compone la tarjeta completa: primero el contenido (sobre lienzo
 * transparente), después la tarjeta de vidrio y por último el fondo, ambos
 * con `destination-over` para que queden por detrás.
 */
function dibujarTarjeta(receta, foto, altoBase) {
  const ancho = 1080;
  const margen = 48;
  const pad = 52;
  const panelX = margen;
  const panelW = ancho - margen * 2;
  const x = panelX + pad;
  const util = panelW - pad * 2;
  const panelY = BARRA + 40;

  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = altoBase;
  const ctx = lienzo.getContext('2d');

  // 1) Contenido
  const yFin = dibujarContenido(ctx, receta, foto, { x, util, y: panelY + pad });
  const panelH = yFin - panelY + pad;
  const altoUsado = Math.min(Math.ceil(panelY + panelH + 56), 16000);

  // 2) Tarjeta de vidrio por detrás del contenido
  ctx.globalCompositeOperation = 'destination-over';
  dibujarPanel(ctx, panelX, panelY, panelW, panelH);

  // 3) Fondo (crema + destellos + barra) por detrás de todo
  const fondo = document.createElement('canvas');
  fondo.width = ancho;
  fondo.height = altoBase;
  dibujarFondo(fondo.getContext('2d'), ancho, altoBase);
  ctx.drawImage(fondo, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  return { lienzo, altoUsado };
}

/** Genera el PNG (con foto si es posible; si el canvas queda contaminado, reintenta sin foto). */
async function generarPng(receta) {
  const foto = await cargarImagen(receta.imagen);

  const intentar = async (conFoto) => {
    let alto = 4096;
    let resultado = dibujarTarjeta(receta, conFoto ? foto : null, alto);
    if (resultado.altoUsado > alto) {
      alto = Math.min(Math.ceil(resultado.altoUsado + 64), 16000);
      resultado = dibujarTarjeta(receta, conFoto ? foto : null, alto);
    }
    const { lienzo, altoUsado } = resultado;
    const salida = document.createElement('canvas');
    salida.width = lienzo.width;
    salida.height = Math.min(Math.ceil(altoUsado), 16000);
    salida
      .getContext('2d')
      .drawImage(lienzo, 0, 0, salida.width, salida.height, 0, 0, salida.width, salida.height);
    return new Promise((resolver, rechazar) => {
      salida.toBlob(
        (blob) => (blob ? resolver(blob) : rechazar(new Error('No se pudo generar la imagen'))),
        'image/png',
      );
    });
  };

  try {
    return await intentar(Boolean(foto));
  } catch (err) {
    // Canvas contaminado por una foto sin cabeceras CORS → se reintenta sin ella
    if (foto && (err?.name === 'SecurityError' || /tainted|Security/i.test(err?.message || ''))) {
      return intentar(false);
    }
    throw err;
  }
}

/** Descarga la receta como imagen PNG (tarjeta). */
export async function descargarImagenReceta(receta) {
  const blob = await generarPng(receta);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `sazonlab-${slug(receta.titulo)}.png`;
  document.body.appendChild(enlace);
  enlace.click();
  // No se retira el nodo en el mismo tick: en Electron eso interrumpe
  // la descarga del blob. Se limpia a los 15 s.
  setTimeout(() => enlace.remove(), 15000);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function metaReceta(receta) {
  const partes = [];
  if (receta.tiempo) partes.push(`${receta.tiempo} min`);
  if (receta.dificultad) partes.push(DIFICULTADES[receta.dificultad] || receta.dificultad);
  if (receta.porciones) partes.push(`${receta.porciones} porciones`);
  return partes.join(' · ');
}

/**
 * Abre la vista de impresión con solo la receta: el diálogo nativo ofrece
 * "Guardar como PDF" (Chrome/Edge) o "PDF" (Firefox).
 * Espera a que la foto de la comida se cargue antes de imprimir y solo
 * limpia al cerrarse el diálogo (afterprint) — en Electron print() NO
 * bloquea el hilo, un respaldo corto borraba la receta y el PDF salía
 * en blanco.
 */
export async function imprimirReceta(receta) {
  const cont = document.createElement('div');
  cont.className = 'libro libro-oculto';
  const ingredientes = (receta.ingredientes || [])
    .map(
      (i) =>
        `<li>${escaparHtml(i.nombre)}${i.cantidad ? ` — ${escaparHtml(i.cantidad)}` : ''}</li>`,
    )
    .join('');
  const pasos = (receta.pasos || []).map((p) => `<li>${escaparHtml(p)}</li>`).join('');
  const meta = metaReceta(receta);

  const chips = [];
  if (receta.tiempo) {
    chips.push(
      `<span class="libro-chip libro-chip-verde"><i class="fa-solid fa-clock" aria-hidden="true"></i> ${receta.tiempo} min</span>`,
    );
  }
  if (receta.dificultad) {
    chips.push(
      `<span class="libro-chip libro-chip-ambar"><i class="fa-solid fa-signal" aria-hidden="true"></i> ${escaparHtml(DIFICULTADES[receta.dificultad] || receta.dificultad)}</span>`,
    );
  }
  if (receta.porciones) {
    chips.push(
      `<span class="libro-chip libro-chip-verde"><i class="fa-solid fa-users" aria-hidden="true"></i> ${receta.porciones} porciones</span>`,
    );
  }

  cont.innerHTML = `
    <section class="libro-pagina" aria-label="${escaparHtml(receta.titulo)}">
      <p class="libro-marca" aria-hidden="true">
        <span class="libro-marca-ico"><i class="fa-solid fa-bowl-food"></i></span>
        SazónLab · Recetario Inteligente
      </p>
      <header class="libro-cabecera">
        <span class="libro-numero">1</span>
        <h2>${escaparHtml(receta.titulo)}</h2>
      </header>
      ${receta.imagen ? `<img class="libro-imagen" src="${escaparHtml(receta.imagen)}" alt="">` : ''}
      ${receta.descripcion ? `<p class="libro-desc">${escaparHtml(receta.descripcion)}</p>` : ''}
      ${chips.length ? `<p class="libro-meta">${chips.join('')}</p>` : meta ? `<p class="libro-meta">${escaparHtml(meta)}</p>` : ''}
      <div class="libro-cols">
        <div>
          <h3>Ingredientes</h3>
          <ul role="list">${ingredientes || '<li class="italic">Sin ingredientes</li>'}</ul>
        </div>
        <div>
          <h3>Preparación</h3>
          <ol>${pasos || '<li class="italic">Sin pasos</li>'}</ol>
        </div>
      </div>
      <footer class="libro-pie">SazónLab — Recetario Inteligente · impreso el ${new Date().toLocaleDateString('es-ES')}</footer>
    </section>`;

  document.body.appendChild(cont);
  document.body.classList.add('solo-receta');

  let seguridad = null;
  let limpiado = false;
  const limpiar = () => {
    if (limpiado) return;
    limpiado = true;
    clearTimeout(seguridad);
    cont.remove();
    document.body.classList.remove('solo-receta');
    window.removeEventListener('afterprint', limpiar);
  };
  window.addEventListener('afterprint', limpiar);
  // Respaldo largo por si el navegador no emite afterprint: la clase
  // `solo-receta` no afecta a la pantalla, solo a la impresión.
  seguridad = setTimeout(limpiar, 5 * 60 * 1000);

  // La foto de la comida debe estar en el PDF: se espera su carga (máx. 4 s)
  const img = cont.querySelector('img');
  if (img && !img.complete) {
    await new Promise((resolver) => {
      img.addEventListener('load', resolver, { once: true });
      img.addEventListener('error', resolver, { once: true });
      setTimeout(resolver, 4000);
    });
  }

  try {
    window.print();
  } catch {
    limpiar();
    throw new Error('No se pudo abrir el diálogo de impresión');
  }
}
