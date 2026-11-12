/**
 * Sincroniza los artefactos que consume el .exe (Fase 8):
 *  - app/dist        → desktop/renderer   (UI compilada con base './')
 *  - server/src      → desktop/server/src (API embebida, ESM)
 *  - server/package.json → desktop/server/package.json (declara "type":"module")
 *
 * `desktop/server` y `desktop/renderer` son generados (gitignored).
 * Uso: npm run sincronizar:desktop  (también lo ejecuta build:exe)
 */
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');

const origenRenderer = path.join(raiz, 'app', 'dist');
const destinoRenderer = path.join(raiz, 'desktop', 'renderer');
const origenServer = path.join(raiz, 'server', 'src');
const destinoServer = path.join(raiz, 'desktop', 'server');

if (!fs.existsSync(path.join(origenRenderer, 'index.html'))) {
  console.error('FALLO: falta app/dist/index.html — ejecuta antes: npm run build:app');
  process.exit(1);
}
if (!fs.existsSync(origenServer)) {
  console.error('FALLO: falta server/src');
  process.exit(1);
}

fs.rmSync(destinoRenderer, { recursive: true, force: true });
fs.cpSync(origenRenderer, destinoRenderer, { recursive: true });

fs.rmSync(destinoServer, { recursive: true, force: true });
fs.cpSync(origenServer, path.join(destinoServer, 'src'), { recursive: true });
fs.copyFileSync(
  path.join(raiz, 'server', 'package.json'),
  path.join(destinoServer, 'package.json'),
);

console.log('OK: desktop/renderer (UI) + desktop/server (API embebida) sincronizados');
