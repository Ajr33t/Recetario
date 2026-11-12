/**
 * Copia el instalador de escritorio generado a los dos destinos visibles:
 *   1. la raíz del proyecto  → «SazónLab-Setup-1.0.0.exe» (a la vista)
 *   2. landing/public/       → el enlace de descarga de la página oficial
 *
 * El .exe pesa ~124,7 MB: NO se versiona en Git (límite de 100 MB), por eso
 * se regenera con `npm run build:exe` y se reparte con este script.
 * Uso: npm run copiar:exe
 */
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const RELEASE = path.join(RAIZ, 'desktop', 'release');
const NOMBRE = 'SazónLab-Setup-1.0.0.exe';

/** Último .exe generado en desktop/release (evita depender del nombre exacto). */
function buscarInstalador() {
  if (!fs.existsSync(RELEASE)) return null;
  const candidatos = fs
    .readdirSync(RELEASE)
    .filter((n) => n.toLowerCase().endsWith('.exe') && !n.includes('uninstall'))
    .map((n) => path.join(RELEASE, n))
    .filter((p) => fs.statSync(p).isFile())
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return candidatos[0] || null;
}

function main() {
  const origen = buscarInstalador();
  if (!origen) {
    console.error('[SazónLab] No hay instalador en desktop/release — ejecuta: npm run build:exe');
    process.exitCode = 1;
    return;
  }

  const destinos = [path.join(RAIZ, NOMBRE), path.join(RAIZ, 'landing', 'public', NOMBRE)];

  for (const destino of destinos) {
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.copyFileSync(origen, destino);
    const mb = (fs.statSync(destino).size / (1024 * 1024)).toFixed(1);
    console.log(`[SazónLab] Copiado → ${path.relative(RAIZ, destino)} (${mb} MB)`);
  }
  console.log(`[SazónLab] Instalador listo: ${NOMBRE}`);
}

main();
