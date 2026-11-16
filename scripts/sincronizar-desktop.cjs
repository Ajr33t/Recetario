/**
 * Sincroniza los artefactos que consume el .exe (Fase 8/10):
 *  - apps/web/dist          → apps/desktop/renderer   (UI compilada con base './')
 *  - apps/api/src           → apps/desktop/server/src  (API embebida, ESM)
 *  - apps/api/package.json  → apps/desktop/server/package.json ("type":"module")
 *
 * `apps/desktop/server` y `apps/desktop/renderer` son generados (gitignored).
 * Uso: npm run sincronizar:desktop  (también lo ejecuta build:exe)
 */
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');

const origenRenderer = path.join(raiz, 'apps', 'web', 'dist');
const destinoRenderer = path.join(raiz, 'apps', 'desktop', 'renderer');
const origenServer = path.join(raiz, 'apps', 'api', 'src');
const destinoServer = path.join(raiz, 'apps', 'desktop', 'server');

if (!fs.existsSync(path.join(origenRenderer, 'index.html'))) {
  console.error('FALLO: falta apps/web/dist/index.html — ejecuta antes: npm run build:app');
  process.exit(1);
}
if (!fs.existsSync(origenServer)) {
  console.error('FALLO: falta apps/api/src');
  process.exit(1);
}

fs.rmSync(destinoRenderer, { recursive: true, force: true });
fs.cpSync(origenRenderer, destinoRenderer, { recursive: true });

fs.rmSync(destinoServer, { recursive: true, force: true });
fs.cpSync(origenServer, path.join(destinoServer, 'src'), { recursive: true });
fs.copyFileSync(
  path.join(raiz, 'apps', 'api', 'package.json'),
  path.join(destinoServer, 'package.json'),
);

console.log('OK: apps/desktop/renderer (UI) + apps/desktop/server (API embebida) sincronizados');
