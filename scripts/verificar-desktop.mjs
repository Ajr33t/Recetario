/**
 * Verificación de la app de escritorio empaquetada (.exe) — Fase 8.
 *
 * 1. Estático: el win-unpacked existe, el asar contiene la UI compilada
 *    (renderer/) y la API embebida (server/), y todo está desempaquetado
 *    (node_modules + server fuera del asar para poder dlopen y resolver).
 * 2. Ejecuta SazonLab.exe con depuración remota y comprueba:
 *    - /api/health responde en 4731 con database:'ok' (SQLite local OK)
 *    - la UI cargó (CDP: React montado, file:// + ?apiPort=4731)
 *    - flujo real sobre la API embebida: registro → receta → favorito
 * 3. Al cerrar: el proceso hijo de la API queda liberado (sin huérfanos)
 *    y existía %APPDATA%/SazonLab/sazonlab.db (creado en esta corrida).
 *
 * Requisitos: `npm run build:exe` previo (genera release/win-unpacked).
 * Uso: npm run verificar:desktop
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const asar = require('@electron/asar');

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXE = path.join(raiz, 'desktop', 'release', 'win-unpacked', 'SazonLab.exe');
const ASAR = path.join(raiz, 'desktop', 'release', 'win-unpacked', 'resources', 'app.asar');
const UNPACKED = path.join(
  raiz,
  'desktop',
  'release',
  'win-unpacked',
  'resources',
  'app.asar.unpacked',
);
const PUERTO_API = 4731;
const PUERTO_CDP = 9333;
const DB_USUARIO = path.join(os.homedir(), 'AppData', 'Roaming', 'SazonLab', 'sazonlab.db');

let fallos = 0;
const check = (nombre, cond, detalle = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? 'OK  ' : 'FALLO'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

/** Espera (con reintentos) a que una condición async sea verdadera. */
async function esperar(fn, ms = 10000, intervalo = 300) {
  const limite = Date.now() + ms;
  for (;;) {
    try {
      if (await fn()) return true;
    } catch {
      /* sigue intentando */
    }
    if (Date.now() > limite) return false;
    await new Promise((r) => setTimeout(r, intervalo));
  }
}

async function llamar(metodo, ruta, { token, body } = {}) {
  const r = await fetch(`http://127.0.0.1:${PUERTO_API}/api${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let datos = null;
  try {
    datos = await r.json();
  } catch {
    /* sin cuerpo */
  }
  return { status: r.status, datos };
}

/** Normaliza una ruta del asar a '/relativa/con/slashes'. */
function normalizarAsar(entrada) {
  let p = entrada.replace(/\\/g, '/');
  const i = p.toLowerCase().indexOf('app.asar');
  if (i >= 0) p = p.slice(i + 'app.asar'.length);
  if (!p.startsWith('/')) p = `/${p}`;
  return p;
}

/** Evalúa JS en la primera página vía CDP (WebSocket global de Node). */
async function evaluarEnPagina(expresion, ms = 8000) {
  const lista = await (await fetch(`http://127.0.0.1:${PUERTO_CDP}/json/list`)).json();
  const pagina = lista.find((t) => t.type === 'page' && /^file:/.test(t.url || ''));
  if (!pagina) throw new Error('sin objetivo file:// en CDP');
  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  const id = 1;
  const respuesta = new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('timeout CDP')), ms);
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id === id) {
        clearTimeout(timer);
        res(msg.result?.result?.value);
      }
    });
  });
  ws.send(
    JSON.stringify({
      id,
      method: 'Runtime.evaluate',
      params: { expression: expresion, returnByValue: true },
    }),
  );
  const valor = await respuesta;
  ws.close();
  return valor;
}

async function main() {
  // ── 1) Estático ──
  check('win-unpacked/SazonLab.exe existe', fs.existsSync(EXE), 'ejecuta: npm run build:exe');
  if (!fs.existsSync(EXE)) return finalizar(null);

  const entradas = asar.listPackage(ASAR).map((e) => normalizarAsar(e));
  const tiene = (p) => entradas.includes(p);
  check('asar: UI compilada (renderer/index.html)', tiene('/renderer/index.html'));
  check('asar: API embebida (server/src/index.js)', tiene('/server/src/index.js'));
  check('asar: package.json del server (type:module)', tiene('/server/package.json'));
  check(
    'asar: proceso principal (main.js + preload.js)',
    tiene('/main.js') && tiene('/preload.js'),
  );
  check(
    'asar: assets compilados (CSS/JS)',
    entradas.some((e) => e.startsWith('/renderer/assets/')) &&
      entradas.some((e) => e.endsWith('.css')),
  );

  const rutasUnpack = [
    'server/src/index.js',
    'node_modules/express/package.json',
    'node_modules/better-sqlite3/package.json',
  ];
  for (const r of rutasUnpack) {
    check(`desempaquetado: ${r}`, fs.existsSync(path.join(UNPACKED, r)));
  }
  const prebuild = path.join(
    UNPACKED,
    'node_modules',
    'better-sqlite3',
    'prebuilds',
    'win32-x64.node',
  );
  check('desempaquetado: better-sqlite3 prebuild win32-x64', fs.existsSync(prebuild));

  // ── 2) Limpieza previa y arranque ──
  spawnSync('taskkill', ['/IM', 'SazonLab.exe', '/T', '/F'], { stdio: 'ignore' });
  await esperar(async () => {
    try {
      await fetch(`http://127.0.0.1:${PUERTO_API}/api/health`, {
        signal: AbortSignal.timeout(500),
      });
      return false;
    } catch {
      return true; // puerto libre
    }
  }, 5000);

  // La BD del usuario se renombra para probar que el .exe la crea de cero.
  const dbPrevia = `${DB_USUARIO}.previa`;
  if (fs.existsSync(DB_USUARIO)) {
    fs.rmSync(dbPrevia, { force: true });
    fs.renameSync(DB_USUARIO, dbPrevia);
  }

  const hijo = spawn(EXE, [`--remote-debugging-port=${PUERTO_CDP}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: false,
  });
  let registroProceso = '';
  hijo.stdout?.on('data', (d) => (registroProceso += String(d)));
  hijo.stderr?.on('data', (d) => (registroProceso += String(d)));

  const matarArbol = () => {
    if (hijo.exitCode === null) {
      spawnSync('taskkill', ['/PID', String(hijo.pid), '/T', '/F'], { stdio: 'ignore' });
    }
  };

  try {
    // health de la API embebida
    const saludOk = await esperar(async () => {
      const r = await fetch(`http://127.0.0.1:${PUERTO_API}/api/health`, {
        signal: AbortSignal.timeout(1500),
      });
      return r.ok;
    }, 20000);
    check('API embebida responde en 127.0.0.1:4731', saludOk);
    if (saludOk) {
      const salud = await (await fetch(`http://127.0.0.1:${PUERTO_API}/api/health`)).json();
      check(
        'health: status=ok y database=ok (SQLite local)',
        salud.status === 'ok' && salud.database === 'ok',
        `status=${salud.status} database=${salud.database}`,
      );
    }

    // la UI cargó desde file://
    const objetivoOk = await esperar(async () => {
      const lista = await (
        await fetch(`http://127.0.0.1:${PUERTO_CDP}/json/list`, {
          signal: AbortSignal.timeout(1500),
        })
      ).json();
      return lista.some((t) => t.type === 'page' && /^file:/.test(t.url || ''));
    }, 20000);
    check('ventana cargada desde file:// (CDP)', objetivoOk);

    if (objetivoOk) {
      const montada = await esperar(
        () => evaluarEnPagina(`document.querySelector('#root')?.childElementCount > 0`),
        15000,
      );
      check('React montado en #root (UI real, no vacía)', montada === true);

      const meta = await evaluarEnPagina(
        `JSON.stringify({ proto: location.protocol, puerto: new URLSearchParams(location.search).get('apiPort') })`,
      ).catch(() => null);
      const datos = meta ? JSON.parse(meta) : {};
      check(
        'renderer descubre la API (file: + apiPort=4731)',
        datos.proto === 'file:' && datos.puerto === String(PUERTO_API),
        JSON.stringify(datos),
      );
    }

    // flujo real sobre la API embebida
    if (saludOk) {
      const correo = `test-desktop-${Date.now()}@sazonlab.test`;
      const reg = await llamar('POST', '/auth/registro', {
        body: { nombre: 'Tester Fase 8', correo, contrasena: 'clave-f8-123456' },
      });
      check(
        'registro en la BD local del .exe → 201 + token',
        reg.status === 201 && Boolean(reg.datos?.token),
        `status=${reg.status}`,
      );
      const token = reg.datos?.token;

      const creada = await llamar('POST', '/recipes', {
        token,
        body: {
          titulo: 'Sazón de la casa',
          descripcion: 'Receta creada desde el .exe',
          tiempo_min: 30,
          dificultad: 'facil',
          porciones: 2,
          etiquetas: ['offline'],
          ingredientes: [{ nombre: 'pollo', cantidad: 1, unidad: 'kg' }],
          pasos: [{ descripcion: 'Cocinar con sazón' }],
        },
      });
      check(
        'POST /recipes crea receta local → 201',
        creada.status === 201,
        `status=${creada.status}`,
      );
      const id = creada.datos?.receta?.id;

      const lista = await llamar('GET', '/recipes', { token });
      check(
        'GET /recipes lista la receta creada',
        (lista.datos?.recetas || []).some((r) => r.id === id),
        `n=${(lista.datos?.recetas || []).length}`,
      );

      const fav = await llamar('POST', `/favorites/${id}`, { token });
      check(
        'POST /favorites marca favorita',
        fav.status === 200 && fav.datos?.favorito === true,
        `status=${fav.status}`,
      );
      const favoritas = await llamar('GET', '/favorites', { token });
      check(
        'GET /favorites lista 1',
        (favoritas.datos?.favoritos || []).length >= 1,
        `n=${(favoritas.datos?.favoritos || []).length}`,
      );
    }
  } finally {
    matarArbol();
  }

  // ── 3) Cierre limpio y persistencia ──
  const puertoLibre = await esperar(async () => {
    try {
      await fetch(`http://127.0.0.1:${PUERTO_API}/api/health`, {
        signal: AbortSignal.timeout(500),
      });
      return false;
    } catch {
      return true;
    }
  }, 8000);
  check('al cerrar se libera el puerto 4731 (sin API huérfana)', puertoLibre);

  const dbNueva = fs.existsSync(DB_USUARIO) && fs.statSync(DB_USUARIO).size > 0;
  check(
    'SQLite creada en %APPDATA%\\SazonLab\\sazonlab.db',
    dbNueva,
    dbNueva ? `${(fs.statSync(DB_USUARIO).size / 1024).toFixed(1)} KB` : 'no encontrada',
  );

  if (!puertoLibre || !dbNueva) {
    console.log('--- salida del proceso (últimas líneas) ---');
    console.log(registroProceso.split('\n').slice(-15).join('\n'));
  }

  finalizar(hijo);
}

function finalizar(hijo) {
  if (hijo && hijo.exitCode === null) {
    spawnSync('taskkill', ['/PID', String(hijo.pid), '/T', '/F'], { stdio: 'ignore' });
  }
  console.log('');
  if (fallos === 0) {
    console.log('TODO OK — la app de escritorio funciona con SQLite local y assets compilados');
    process.exit(0);
  }
  console.log(`${fallos} FALLO(S) en verificar:desktop`);
  process.exit(1);
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
