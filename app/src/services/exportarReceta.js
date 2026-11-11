/**
 * Exportación de recetas sin dependencias (Fase 5 — solicitud del cliente):
 * - `descargarImagenReceta`: tarjeta PNG dibujada en <canvas> con título,
 *   foto, ingredientes y pasos (misma estética que el libro de cocina).
 * - `imprimirReceta`: vista imprimible reutilizando el CSS del libro; el
 *   diálogo nativo del navegador ofrece "Guardar como PDF".
 *
 * Ambos aceptan la receta normalizada de RecetaDetalle.jsx
 * ({ titulo, descripcion, imagen, ingredientes, pasos, tiempo, ... }).
 */

const DIFICULTADES = { facil: 'Fácil', media: 'Media', dificil: 'Difícil' };

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

/** Dibuja la tarjeta; devuelve el lienzo y la altura usada. */
function dibujarTarjeta(receta, foto, altoBase) {
  const ancho = 1080;
  const margen = 64;
  const util = ancho - margen * 2;

  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = altoBase;
  const ctx = lienzo.getContext('2d');
  ctx.textBaseline = 'top';

  // Fondo papel
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ancho, altoBase);

  // Banda de marca
  let y = 0;
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, ancho, 10);
  y = 10 + 48;

  ctx.fillStyle = '#0284c7';
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText('SAZÓNLAB · RECETARIO INTELIGENTE', margen, y);
  y += 62;

  // Título
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 54px system-ui, sans-serif';
  for (const linea of partirLineas(ctx, receta.titulo || 'Sin título', util)) {
    ctx.fillText(linea, margen, y);
    y += 66;
  }
  y += 18;

  // Meta: tiempo · dificultad · porciones
  const partes = [];
  if (receta.tiempo) partes.push(`${receta.tiempo} min`);
  if (receta.dificultad) partes.push(DIFICULTADES[receta.dificultad] || receta.dificultad);
  if (receta.porciones) partes.push(`${receta.porciones} porciones`);
  if (partes.length) {
    ctx.fillStyle = '#475569';
    ctx.font = '500 30px system-ui, sans-serif';
    ctx.fillText(partes.join('   ·   '), margen, y);
    y += 52;
  }

  // Foto (recorte tipo "cover")
  if (foto && foto.width > 0 && foto.height > 0) {
    const altoFoto = 400;
    const escala = Math.max(util / foto.width, altoFoto / foto.height);
    const dw = foto.width * escala;
    const dh = foto.height * escala;
    ctx.save();
    ctx.beginPath();
    ctx.rect(margen, y, util, altoFoto);
    ctx.clip();
    ctx.drawImage(foto, margen + (util - dw) / 2, y + (altoFoto - dh) / 2, dw, dh);
    ctx.restore();
    y += altoFoto + 48;
  }

  // Descripción
  if (receta.descripcion) {
    ctx.fillStyle = '#334155';
    ctx.font = '400 30px system-ui, sans-serif';
    for (const linea of partirLineas(ctx, receta.descripcion, util)) {
      ctx.fillText(linea, margen, y);
      y += 42;
    }
    y += 26;
  }

  // Ingredientes
  ctx.fillStyle = '#0284c7';
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText('Ingredientes', margen, y);
  y += 50;
  ctx.fillStyle = '#0f172a';
  ctx.font = '400 30px system-ui, sans-serif';
  for (const ing of receta.ingredientes || []) {
    const texto = `• ${ing.nombre}${ing.cantidad ? ` — ${ing.cantidad}` : ''}`;
    const lineas = partirLineas(ctx, texto, util - 24);
    lineas.forEach((linea, i) => {
      ctx.fillText(linea, margen + (i === 0 ? 0 : 24), y);
      y += 42;
    });
    y += 8;
  }
  if (!(receta.ingredientes || []).length) {
    ctx.fillStyle = '#64748b';
    ctx.fillText('Sin ingredientes registrados', margen, y);
    y += 50;
  }
  y += 34;

  // Preparación
  ctx.fillStyle = '#0284c7';
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText('Preparación', margen, y);
  y += 50;
  ctx.fillStyle = '#0f172a';
  ctx.font = '400 30px system-ui, sans-serif';
  (receta.pasos || []).forEach((paso, i) => {
    const lineas = partirLineas(ctx, `${i + 1}. ${paso}`, util - 44);
    lineas.forEach((linea, j) => {
      ctx.fillText(linea, margen + (j === 0 ? 0 : 44), y);
      y += 42;
    });
    y += 12;
  });
  if (!(receta.pasos || []).length) {
    ctx.fillStyle = '#64748b';
    ctx.fillText('Sin pasos de preparación', margen, y);
    y += 50;
  }

  // Pie
  y += 26;
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(margen, y, util, 2);
  y += 18;
  ctx.fillStyle = '#64748b';
  ctx.font = '400 24px system-ui, sans-serif';
  ctx.fillText(`Receta de SazónLab — ${new Date().toLocaleDateString('es-ES')}`, margen, y);
  y += 40;

  return { lienzo, altoUsado: y };
}

/** Genera el PNG (con foto si es posible; si el canvas queda contaminado, reintenta sin foto). */
async function generarPng(receta) {
  const foto = await cargarImagen(receta.imagen);

  const intentar = async (conFoto) => {
    let alto = 4096;
    let resultado = null;
    // Se crece el lienzo hasta que todo el contenido quepa
    for (let i = 0; i < 5; i++) {
      resultado = dibujarTarjeta(receta, conFoto ? foto : null, alto);
      if (resultado.altoUsado <= alto) break;
      alto = Math.min(Math.ceil(resultado.altoUsado + 64), 16000);
      resultado = dibujarTarjeta(receta, conFoto ? foto : null, alto);
      break;
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
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
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
 */
export function imprimirReceta(receta) {
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

  cont.innerHTML = `
    <section class="libro-pagina" aria-label="${escaparHtml(receta.titulo)}">
      <header class="libro-cabecera">
        <span class="libro-numero">1</span>
        <h2>${escaparHtml(receta.titulo)}</h2>
      </header>
      ${receta.imagen ? `<img class="libro-imagen" src="${escaparHtml(receta.imagen)}" alt="">` : ''}
      ${receta.descripcion ? `<p class="libro-desc">${escaparHtml(receta.descripcion)}</p>` : ''}
      ${meta ? `<p class="libro-meta">${escaparHtml(meta)}</p>` : ''}
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

  const limpiar = () => {
    cont.remove();
    document.body.classList.remove('solo-receta');
    window.removeEventListener('afterprint', limpiar);
  };
  window.addEventListener('afterprint', limpiar);

  try {
    window.print();
  } catch {
    limpiar();
    throw new Error('No se pudo abrir el diálogo de impresión');
  }
  // Respaldo si el navegador no dispara afterprint
  setTimeout(() => {
    if (document.body.contains(cont)) limpiar();
  }, 1500);
}
