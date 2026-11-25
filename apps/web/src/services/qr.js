/**
 * Generación de códigos QR para la carta digital (punto 7 del encargo).
 * Usa la librería ligera `qrcode` (offline) y permite personalizar colores,
 * tamaño, logo central, marco y etiqueta. Formatos: PNG, SVG y PDF
 * (mediante el diálogo de impresión del navegador, sin librerías extra).
 */
import QRCode from 'qrcode';

/** URL absoluta de la carta pública del chef. */
export function urlPublicaCarta(userId) {
  const base =
    import.meta.env.VITE_CARTA_BASE_URL ||
    (typeof window !== 'undefined' && window.location.protocol !== 'file:'
      ? `${window.location.origin}/`
      : 'http://localhost:5173/');
  return `${base.replace(/\/$/, '')}/#/carta/${userId}`;
}

/** Opciones normalizeadas con valores por defecto. */
function opcionesQR(o = {}) {
  return {
    url: o.url || '',
    foreground: o.foreground || '#0f172a',
    background: o.background || '#ffffff',
    size: Math.max(128, Math.min(1024, Number(o.size) || 512)),
    logo: typeof o.logo === 'string' ? o.logo : null,
    marco: Boolean(o.marco),
    etiqueta: String(o.etiqueta || '').slice(0, 60),
  };
}

function cargarImagen(src) {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = rechazar;
    img.src = src;
  });
}

function esquinasRedondeadas(ctx, x, y, ancho, alto, radio) {
  ctx.beginPath();
  ctx.moveTo(x + radio, y);
  ctx.arcTo(x + ancho, y, x + ancho, y + alto, radio);
  ctx.arcTo(x + ancho, y + alto, x, y + alto, radio);
  ctx.arcTo(x, y + alto, x, y, radio);
  ctx.arcTo(x, y, x + ancho, y, radio);
  ctx.closePath();
}

/** Dibuja el QR (y opcionalmente logo, marco y etiqueta) en un canvas. */
async function dibujarQR(op) {
  const marco = op.marco || op.etiqueta;
  const relleno = 28;
  const altoEtiqueta = op.etiqueta ? 52 : 0;
  const lado = op.size;
  const lienzo = document.createElement('canvas');
  lienzo.width = lado + (marco ? relleno * 2 : 0);
  lienzo.height = lado + (marco ? relleno * 2 + altoEtiqueta : 0);
  const ctx = lienzo.getContext('2d');

  if (marco) {
    ctx.fillStyle = op.background;
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.strokeStyle = op.foreground;
    ctx.lineWidth = 3;
    esquinasRedondeadas(ctx, 4, 4, lienzo.width - 8, lienzo.height - 8, 18);
    ctx.stroke();
  }

  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, op.url, {
    width: lado,
    margin: 1,
    errorCorrectionLevel: 'H', // permite poner un logo en el centro
    color: { dark: op.foreground, light: op.background },
  });
  const x = marco ? relleno : 0;
  const y = marco ? relleno : 0;
  ctx.drawImage(qr, x, y);

  // Logo central (sobre fondo claro para no tapar los módulos crítica).
  if (op.logo) {
    try {
      const img = await cargarImagen(op.logo);
      const tam = Math.round(lado * 0.2);
      const lx = x + (lado - tam) / 2;
      const ly = y + (lado - tam) / 2;
      ctx.fillStyle = '#ffffff';
      esquinasRedondeadas(ctx, lx - 6, ly - 6, tam + 12, tam + 12, 10);
      ctx.fill();
      ctx.drawImage(img, lx, ly, tam, tam);
    } catch {
      // Logo no legible: se genera el QR sin él.
    }
  }

  if (op.etiqueta) {
    ctx.fillStyle = op.foreground;
    ctx.font = `600 ${Math.max(18, Math.round(lado * 0.055))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(op.etiqueta, lienzo.width / 2, y + lado + relleno + altoEtiqueta / 2);
  }

  return lienzo;
}

/** Devuelve el QR como Blob PNG. */
export async function generarQRPng(opciones) {
  const lienzo = await dibujarQR(opcionesQR(opciones));
  return new Promise((resolver, rechazar) => {
    lienzo.toBlob(
      (blob) => (blob ? resolver(blob) : rechazar(new Error('No se pudo generar el QR'))),
      'image/png',
    );
  });
}

/** Devuelve el QR como SVG (vectorial, escalable). */
export async function generarQRSvg(opciones) {
  const op = opcionesQR(opciones);
  const relleno = op.marco || op.etiqueta ? 28 : 0;
  const altoEtiqueta = op.etiqueta ? 52 : 0;
  const ancho = op.size + relleno * 2;
  const alto = op.size + relleno * 2 + altoEtiqueta;
  const textoQR = await QRCode.toString(op.url, {
    type: 'svg',
    width: op.size,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: op.foreground, light: op.background },
  });
  const qrBase64 = btoa(unescape(encodeURIComponent(textoQR)));
  const logo = op.logo
    ? `<image x="${relleno + op.size * 0.4}" y="${relleno + op.size * 0.4}" width="${op.size * 0.2}" height="${op.size * 0.2}" href="${op.logo}"/>`
    : '';
  const etiqueta = op.etiqueta
    ? `<text x="${ancho / 2}" y="${relleno + op.size + 34}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.max(18, Math.round(op.size * 0.055))}" font-weight="600" fill="${op.foreground}">${escaparXml(op.etiqueta)}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
    <rect width="${ancho}" height="${alto}" fill="${op.background}"/>
    ${op.marco ? `<rect x="4" y="4" width="${ancho - 8}" height="${alto - 8}" rx="18" fill="none" stroke="${op.foreground}" stroke-width="3"/>` : ''}
    <image x="${relleno}" y="${relleno}" width="${op.size}" height="${op.size}" href="data:image/svg+xml;base64,${qrBase64}"/>
    ${logo}${etiqueta}
  </svg>`;
}

function escaparXml(texto) {
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** Descarga el QR en el formato elegido. */
export async function descargarQR(opciones, formato = 'png', nombre = 'qr-carta') {
  if (formato === 'svg') {
    const svg = await generarQRSvg(opciones);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    descargarUrl(url, `${nombre}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return;
  }
  const blob = await generarQRPng(opciones);
  const url = URL.createObjectURL(blob);
  descargarUrl(url, `${nombre}.png`);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function descargarUrl(url, nombre) {
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  setTimeout(() => enlace.remove(), 15000);
}

/** Abre el diálogo de impresión para guardar el QR como PDF. */
export async function imprimirQR(opciones) {
  const blob = await generarQRPng(opciones);
  const url = URL.createObjectURL(blob);
  const nodo = document.createElement('div');
  nodo.id = 'qr-para-imprimir';
  nodo.style.cssText = 'position:fixed;left:-10000px;top:0;background:#fff;padding:24px;text-align:center';
  nodo.innerHTML = `<img src="${url}" alt="Código QR de la carta" style="width:100%;max-width:420px">`;
  const estilo = document.createElement('style');
  estilo.textContent = `@media print { @page { size: A4 portrait; margin: 20mm; }
    body * { visibility: hidden !important; }
    #qr-para-imprimir, #qr-para-imprimir * { visibility: visible !important; }
    #qr-para-imprimir { position: absolute !important; left: 0 !important; top: 0 !important; }
  }`;
  document.head.appendChild(estilo);
  document.body.appendChild(nodo);
  const limpiar = () => {
    nodo.remove();
    estilo.remove();
    URL.revokeObjectURL(url);
  };
  window.addEventListener('afterprint', limpiar, { once: true });
  setTimeout(limpiar, 60000);
  window.print();
}
