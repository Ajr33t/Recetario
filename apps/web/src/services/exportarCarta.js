/**
 * Exportaciones de la carta del chef (puntos 3, 4 y 6 del encargo).
 * - PDF: se genera con el diálogo de impresión del navegador (sin librerías).
 * - Imagen: se dibuja en un <canvas> y se descarga como PNG.
 * Respeta color, tipografía, orientación, tamaño, versión con/sin precio,
 * visibilidad de alérgenos/composición y logo.
 */
import { etiquetaAlergeno } from '../data/alergenos.js';

const TAMANOS = {
  A4: [1240, 1754],
  A5: [878, 1240],
  carta: [1275, 1650],
  personalizado: [1240, 1754],
};

/** Ordena/agrupa los platos según la organización elegida. */
export function organizarPlatos(platos, organizacion = 'categorias') {
  const lista = [...(platos || [])];
  if (organizacion === 'precio') return lista.sort((a, b) => (a.precio ?? 0) - (b.precio ?? 0));
  if (organizacion === 'categorias') {
    return lista.sort(
      (a, b) =>
        String(a.categoria || '').localeCompare(String(b.categoria || ''), 'es') ||
        String(a.titulo || '').localeCompare(String(b.titulo || ''), 'es'),
    );
  }
  return lista.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

/** Colores con valores por defecto (los que falten se rellenan). */
function colores(preferencias = {}) {
  return {
    principal: preferencias.color_principal || '#0ea5e9',
    secundaria: preferencias.color_secundaria || '#134e4a',
    fondo: preferencias.color_fondo || '#ffffff',
    texto: preferencias.color_texto || '#1f2937',
  };
}

/** HTML seguro para el modo impresión. */
function escapar(texto) {
  return String(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Abre el diálogo de impresión (Guardar como PDF) con la carta maquetada. */
export function imprimirCarta(datos) {
  const { restaurante = 'Mi restaurante', platos = [], preferencias = {} } = datos || {};
  const c = colores(preferencias);
  const organs = organizarPlatos(platos, preferencias.organizacion);
  const conPrecio = preferencias.version !== 'sin_precio';
  const apaisado = preferencias.orientacion === 'horizontal';

  const filas = organs
    .map((p, i) => {
      const CAT =
        preferencias.organizacion === 'categorias' &&
        p.categoria &&
        p.categoria !== organs[i - 1]?.categoria
          ? `<h2 style="color:${c.principal};font-size:15pt;margin:16pt 0 4pt">${escapar(p.categoria)}</h2>`
          : '';
      const alerg = preferencias.mostrar_alergenos && p.alergenos?.length
        ? `<p style="font-size:8pt;color:#6b7280;margin:2pt 0">Alérgenos: ${p.alergenos
            .map((a) => escapar(etiquetaAlergeno(a)))
            .join(' · ')}</p>`
        : '';
      const comp = preferencias.mostrar_composicion && p.composicion
        ? `<p style="font-size:8.5pt;color:#4b5563;margin:2pt 0">${escapar(p.composicion)}</p>`
        : '';
      return `${CAT}<div style="border-bottom:1px solid #e5e7eb;padding:6pt 0;break-inside:avoid">
        <div style="display:flex;justify-content:space-between;gap:10pt">
          <strong style="font-size:11pt">${escapar(p.titulo)}</strong>
          ${conPrecio && p.precio != null ? `<span style="color:${c.principal}">${Number(p.precio).toFixed(2)}${preferencias.version === 'ambas' ? ' · sin precio disponible' : ''}</span>` : ''}
        </div>
        ${p.descripcion ? `<p style="font-size:9pt;margin:2pt 0">${escapar(p.descripcion)}</p>` : ''}
        ${comp}${alerg}
      </div>`;
    })
    .join('');

  const nodo = document.createElement('div');
  nodo.id = 'carta-para-imprimir';
  nodo.style.cssText = `position:fixed;left:-10000px;top:0;width:${apaisado ? '297mm' : '210mm'};background:${c.fondo};color:${c.texto};font-family:${escapar(preferencias.tipografia || 'Georgia, serif')};padding:14mm`;
  nodo.innerHTML = `
    ${preferencias.logo ? `<img src="${escapar(preferencias.logo)}" alt="" style="max-height:22mm;max-width:45mm;display:block;margin:0 auto 6mm">` : ''}
    <h1 style="color:${c.principal};text-align:center;font-size:22pt;margin:0 0 3pt">${escapar(restaurante)}</h1>
    <p style="text-align:center;font-size:9pt;color:#6b7280;margin:0 0 10pt">Carta · SazónLab</p>
    ${filas || '<p style="text-align:center">Tu carta aún no tiene platos.</p>'}
  `;

  const estilo = document.createElement('style');
  estilo.id = 'carta-print-style';
  estilo.textContent = `
    @media print {
      @page { size: ${preferencias.tamano === 'carta' ? 'letter' : preferencias.tamano === 'A5' ? 'A5' : 'A4'} ${apaisado ? 'landscape' : 'portrait'}; margin: 12mm; }
      body * { visibility: hidden !important; }
      #carta-para-imprimir, #carta-para-imprimir * { visibility: visible !important; }
      #carta-para-imprimir { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 0 !important; }
    }
  `;
  document.head.appendChild(estilo);
  document.body.appendChild(nodo);
  const limpiar = () => {
    nodo.remove();
    estilo.remove();
  };
  // Se limpia tras imprimir/cancelar (los navegadores no siempre disparan afterprint).
  window.addEventListener('afterprint', limpiar, { once: true });
  setTimeout(limpiar, 60000);
  window.print();
}

/** Dibuja la carta en un canvas y descarga el PNG. */
export async function descargarCartaImagen(datos) {
  const { restaurante = 'Mi restaurante', platos = [], preferencias = {} } = datos || {};
  const c = colores(preferencias);
  const [anchoBase, altoBase] = TAMANOS[preferencias.tamano] || TAMANOS.A4;
  const apaisado = preferencias.orientacion === 'horizontal';
  const ancho = apaisado ? altoBase : anchoBase;
  const alto = apaisado ? anchoBase : altoBase;

  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = c.fondo;
  ctx.fillRect(0, 0, ancho, alto);

  const fuente = preferencias.tipografia || 'Georgia, serif';
  const organs = organizarPlatos(platos, preferencias.organizacion);
  const conPrecio = preferencias.version !== 'sin_precio';
  const margen = 70;
  let y = margen;

  // Logo (data URL local: no contamina el canvas).
  if (preferencias.logo) {
    try {
      const img = new Image();
      img.src = preferencias.logo;
      await img.decode();
      const escala = Math.min(140 / img.width, 1);
      ctx.drawImage(img, ancho / 2 - (img.width * escala) / 2, y, img.width * escala, img.height * escala);
      y += img.height * escala + 20;
    } catch {
      // Logo inválido: se omite sin romper la exportación.
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = c.principal;
  ctx.font = `bold 46px ${fuente}`;
  ctx.fillText(restaurante, ancho / 2, y + 40);
  y += 85;
  ctx.fillStyle = '#6b7280';
  ctx.font = `20px ${fuente}`;
  ctx.fillText('Carta · SazónLab', ancho / 2, y);
  y += 55;

  ctx.textAlign = 'left';
  let categoriaActual = null;
  for (const plato of organs) {
    if (y > alto - 90) break; // no cabe más en la página
    if (preferencias.organizacion === 'categorias' && plato.categoria && plato.categoria !== categoriaActual) {
      categoriaActual = plato.categoria;
      ctx.fillStyle = c.principal;
      ctx.font = `bold 26px ${fuente}`;
      ctx.fillText(plato.categoria, margen, y);
      y += 40;
    }

    ctx.fillStyle = c.texto;
    ctx.font = `bold 24px ${fuente}`;
    const precio = conPrecio && plato.precio != null ? Number(plato.precio).toFixed(2) : '';
    const tituloX = margen;
    ctx.fillText(plato.titulo || '', tituloX, y);
    if (precio) {
      ctx.textAlign = 'right';
      ctx.fillStyle = c.principal;
      ctx.fillText(precio, ancho - margen, y);
      ctx.textAlign = 'left';
    }
    y += 32;

    if (preferencias.mostrar_composicion && plato.composicion) {
      ctx.fillStyle = '#4b5563';
      ctx.font = `18px ${fuente}`;
      y = dibujarTexto(ctx, plato.composicion, margen, y, ancho - 2 * margen, 24);
    }
    if (preferencias.mostrar_alergenos && plato.alergenos?.length) {
      ctx.fillStyle = '#6b7280';
      ctx.font = `16px ${fuente}`;
      y = dibujarTexto(
        ctx,
        `Alérgenos: ${plato.alergenos.map(etiquetaAlergeno).join(' · ')}`,
        margen,
        y,
        ancho - 2 * margen,
        22,
      );
    }
    y += 18;
    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(margen, y - 6);
    ctx.lineTo(ancho - margen, y - 6);
    ctx.stroke();
  }

  return new Promise((resolver, rechazar) => {
    lienzo.toBlob(
      (blob) => (blob ? resolver(blob) : rechazar(new Error('No se pudo generar la imagen'))),
      'image/png',
    );
  });
}

/** Dibuja texto con salto de línea y devuelve la nueva posición Y. */
function dibujarTexto(ctx, texto, x, y, anchoMax, interlineado) {
  const palabras = String(texto).split(/\s+/);
  let linea = '';
  for (const palabra of palabras) {
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > anchoMax && linea) {
      ctx.fillText(linea, x, y);
      y += interlineado;
      linea = palabra;
    } else {
      linea = prueba;
    }
  }
  if (linea) {
    ctx.fillText(linea, x, y);
    y += interlineado;
  }
  return y;
}

/** Descarga el PNG de la carta con el mismo patrón que las recetas. */
export async function descargarCartaComoImagen(datos, nombre = 'mi-carta') {
  const blob = await descargarCartaImagen(datos);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `sazonlab-${nombre}.png`;
  document.body.appendChild(enlace);
  enlace.click();
  setTimeout(() => enlace.remove(), 15000);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
