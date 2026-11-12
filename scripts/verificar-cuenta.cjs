/**
 * Verificación de la eliminación de cuenta con código al correo — Fase 7.
 *
 * 1. API (3001): solicitar código (401 sin sesión), código incorrecto (400),
 *    eliminación correcta, login/me tras borrar (401) y re-registro del mismo
 *    correo (prueba de que la cuenta ya no existe).
 * 2. UI (5173): «Zona de peligro» en /perfil, flujo SweetAlert2 completo
 *    (confirmación → código → borrado), cierre de sesión y vuelta al inicio.
 * 3. axe-core (WCAG 2.1 AA) sobre /perfil antes de borrar.
 *
 * Requisitos: `npm run dev:server` (3001) + `npm run dev:app` (5173).
 * Uso: npm run verificar:cuenta
 */
const { app, BrowserWindow } = require('electron');
const axe = require('axe-core');

app.disableHardwareAcceleration();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const API = 'http://localhost:3001/api';
const BASE = 'http://localhost:5173';

let fallos = 0;
const check = (nombre, cond, detalle = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? 'OK  ' : 'FALLO'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

/** Espera (con reintentos) a que una condición async sea verdadera. */
async function esperar(fn, ms = 7000) {
  const limite = Date.now() + ms;
  for (;;) {
    try {
      if (await fn()) return true;
    } catch {
      /* sigue intentando */
    }
    if (Date.now() > limite) return false;
    await new Promise((r) => setTimeout(r, 250));
  }
}

async function llamar(metodo, ruta, { token, body } = {}) {
  const r = await fetch(`${API}${ruta}`, {
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

async function ejecutarAxe(win, etiqueta) {
  await win.webContents.executeJavaScript(axe.source, true);
  const crudo = await win.webContents.executeJavaScript(
    `axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      resultTypes: ['violations'],
    }).then(r => JSON.stringify(r.violations.map(v => ({
      id: v.id, impact: v.impact, ayuda: v.help,
      nodos: v.nodes.length, ejemplo: (v.nodes[0]?.target || []).join(' ').slice(0, 120),
    })))).catch(e => JSON.stringify({ error: String(e) }))`,
    true,
  );
  const datos = JSON.parse(crudo);
  if (datos.error) return { etiqueta, violaciones: [], error: datos.error };
  return { etiqueta, violaciones: datos, error: null };
}

app.whenReady().then(async () => {
  const js = (expr) => win.webContents.executeJavaScript(expr, true);

  // ── 1) API: flujo completo de eliminación ──
  const correo = `cuenta-${Date.now()}@sazonlab.test`;
  const clave = 'clave-cuenta-123';

  const reg = await llamar('POST', '/auth/registro', {
    body: { nombre: 'Cuenta Eliminar', correo, contrasena: clave },
  });
  check(
    'registro de cuenta de prueba',
    reg.status === 201 && Boolean(reg.datos?.token),
    `status=${reg.status}`,
  );
  const token = reg.datos?.token;

  // Crea una receta propia para comprobar que el borrado no la deja huérfana
  const receta = await llamar('POST', '/recipes', {
    token,
    body: {
      titulo: 'Receta de la cuenta a borrar',
      descripcion: 'Debe desaparecer con la cuenta',
      tiempo_min: 5,
      dificultad: 'facil',
      porciones: 1,
      ingredientes: [{ nombre: 'arroz', cantidad: 1, unidad: 'taza' }],
      pasos: [{ descripcion: 'Cocinar el arroz' }],
    },
  });
  check('receta propia creada', Boolean(receta.datos?.receta?.id));

  const sinToken = await llamar('POST', '/auth/solicitar-eliminacion');
  check('solicitar-eliminacion sin sesión → 401', sinToken.status === 401);

  const solicitar = await llamar('POST', '/auth/solicitar-eliminacion', { token });
  check(
    'solicitar-eliminacion → código de 6 dígitos (modo demo)',
    solicitar.status === 200 && /^\d{6}$/.test(String(solicitar.datos?.codigo || '')),
    `status=${solicitar.status} demo=${solicitar.datos?.demo}`,
  );
  const codigo = String(solicitar.datos?.codigo || '');

  const sinCodigo = await llamar('POST', '/auth/eliminar-cuenta', { token });
  check('eliminar-cuenta sin código → 400', sinCodigo.status === 400);

  const codigoMalo = String((Number(codigo) + 1) % 1000000).padStart(6, '0');
  const mala = await llamar('POST', '/auth/eliminar-cuenta', {
    token,
    body: { codigo: codigoMalo },
  });
  check(
    'eliminar-cuenta con código incorrecto → 400',
    mala.status === 400,
    `status=${mala.status}`,
  );

  const sinToken2 = await llamar('POST', '/auth/eliminar-cuenta', { body: { codigo } });
  check('eliminar-cuenta sin sesión → 401', sinToken2.status === 401);

  const borrado = await llamar('POST', '/auth/eliminar-cuenta', { token, body: { codigo } });
  check(
    'eliminar-cuenta con código válido → ok',
    borrado.status === 200 && borrado.datos?.ok === true,
    `status=${borrado.status} ${borrado.datos?.error || ''}`,
  );

  const me = await llamar('GET', '/auth/me', { token });
  check('GET /auth/me tras borrar → 401', me.status === 401);

  const login = await llamar('POST', '/auth/login', { body: { correo, contrasena: clave } });
  check('login tras borrar → 401', login.status === 401, `status=${login.status}`);

  const reregistro = await llamar('POST', '/auth/registro', {
    body: { nombre: 'Cuenta Eliminar', correo, contrasena: clave },
  });
  check(
    're-registro del mismo correo → la cuenta ya no existe',
    reregistro.status === 201 && Boolean(reregistro.datos?.token),
    `status=${reregistro.status}`,
  );

  // ── 2) UI: Zona de peligro + flujo SweetAlert2 ──
  const reg2 = await llamar('POST', '/auth/registro', {
    body: {
      nombre: 'UI Eliminar Cuenta',
      correo: `ui-cuenta-${Date.now()}@sazonlab.test`,
      contrasena: clave,
    },
  });
  check(
    'registro de cuenta para la UI',
    reg2.status === 201 && Boolean(reg2.datos?.token),
    `status=${reg2.status}`,
  );
  const auth = JSON.stringify({
    state: { token: reg2.datos.token, usuario: reg2.datos.usuario },
    version: 0,
  });

  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  await win.loadURL(`${BASE}/#/perfil`);
  await dormir(700);
  await js(
    `localStorage.setItem('sazonlab-onboarding', 'visto'); localStorage.setItem('sazonlab-auth', ${JSON.stringify(auth)}); true`,
  );
  await win.webContents.reload();
  await dormir(1800);

  const abierto = await esperar(() => js(`/Mi perfil/.test(document.body.textContent)`));
  check('perfil abre con sesión', abierto);
  check(
    'sección «Zona de peligro» presente',
    await esperar(() =>
      js(
        `(() => { const h = [...document.querySelectorAll('h2')].find(h => /Zona de peligro/.test(h.textContent)); return Boolean(h); })()`,
      ),
    ),
  );
  check(
    'botón «Eliminar mi cuenta» presente',
    await js(
      `[...document.querySelectorAll('button')].some(b => /Eliminar mi cuenta/.test(b.textContent))`,
    ),
  );
  check(
    'advertencia irreversible + correo visible',
    await js(
      `(() => { const s = [...document.querySelectorAll('section')].find(s => /Zona de peligro/.test(s.textContent)); return Boolean(s) && /definitivamente/.test(s.textContent) && /@/.test(s.textContent); })()`,
    ),
  );

  const axePerfil = await ejecutarAxe(win, 'App — /perfil');

  // Captura de evidencia (antes de borrar)
  try {
    const fs = require('fs');
    const path = require('path');
    const destino = path.join(__dirname, '..', 'docs', 'evidencias');
    fs.writeFileSync(
      path.join(destino, 'app-06-zona-peligro.png'),
      (await win.webContents.capturePage()).toPNG(),
    );
    console.log('Captura: app-06-zona-peligro.png');
  } catch (err) {
    console.log(`Aviso: no se pudo capturar — ${err.message}`);
  }

  // Paso 1: confirmación (Swal de advertencia)
  await js(
    `[...document.querySelectorAll('button')].find(b => /Eliminar mi cuenta/.test(b.textContent))?.click(); true`,
  );
  const swal1 = await esperar(() =>
    js(
      `(() => { const t = document.querySelector('.swal2-title'); return Boolean(t) && /¿Eliminar tu cuenta\\?/.test(t.textContent); })()`,
    ),
  );
  check('Swal 1: advertencia de eliminación irreversible', swal1);
  check(
    'Swal 1: ofrece enviar el código al correo',
    await js(
      `[...document.querySelectorAll('.swal2-confirm')].some(b => /enviar código/.test(b.textContent))`,
    ),
  );

  // Paso 2: diálogo del código (modo demo viene prellenado)
  await js(`document.querySelector('.swal2-confirm')?.click(); true`);
  const swal2 = await esperar(() => js(`Boolean(document.querySelector('.swal2-input'))`));
  check('Swal 2: pide el código de 6 dígitos', swal2);
  const prellenado = await esperar(() =>
    js(
      `(() => { const i = document.querySelector('.swal2-input'); return Boolean(i) && /^\\d{6}$/.test(i.value); })()`,
    ),
  );
  check('Swal 2: código prellenado en modo demo', prellenado);

  // Paso 3: confirmar → borrado + cierre de sesión + inicio
  await js(`document.querySelector('.swal2-confirm')?.click(); true`);
  const fuera = await esperar(() => js(`location.hash === '#/' || location.hash === '#/login'`));
  check('tras borrar cierra la sesión y sale del perfil', fuera, await js(`location.hash`));
  check(
    'sesión cerrada (sin token persistido)',
    await js(
      `(() => { const v = localStorage.getItem('sazonlab-auth'); return v === null || !/"token":"[^"]+"/.test(v); })()`,
    ),
  );
  check(
    'toast «Cuenta eliminada» visible',
    await esperar(() => js(`/Cuenta eliminada/.test(document.body.textContent)`)),
  );
  check(
    'estado de invitado tras borrar',
    await esperar(() => js(`/Iniciar sesión/.test(document.body.textContent)`)),
  );

  // ── 3) Informe axe ──
  const resultados = [axePerfil];
  const criticos = [];
  for (const r of resultados) {
    if (r.error) {
      console.log(`ERROR  ${r.etiqueta}: ${r.error}`);
      fallos++;
      continue;
    }
    const malos = r.violaciones.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    if (malos.length > 0) criticos.push(r.etiqueta);
    const resumen =
      r.violaciones.length === 0
        ? 'sin violaciones'
        : `${r.violaciones.length} (serias/críticas: ${malos.length})`;
    console.log(`${malos.length === 0 ? 'OK  ' : 'FALLO'} axe · ${r.etiqueta} — ${resumen}`);
    for (const v of r.violations || []) {
      console.log(`      · [${v.impact}] ${v.id}: ${v.ayuda} — nodos=${v.nodos} ${v.ejemplo}`);
    }
  }
  check(
    'axe: 0 violaciones serious/critical en /perfil',
    criticos.length === 0,
    criticos.join(', '),
  );

  console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLO(S)`);
  app.exit(fallos === 0 ? 0 : 1);
});

process.on('unhandledRejection', (err) => {
  console.error('FATAL:', err.message);
  app.exit(1);
});
