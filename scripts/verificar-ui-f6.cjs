/**
 * Verificación UI de la Fase 6 (Sprint 7–8 IEEE):
 *  1. Tour de bienvenida (RF-25): apertura en primera visita, progreso
 *     «Paso X de 6», anillo spotlight, omitir + persistencia, repetir desde
 *     Ajustes.
 *  2. Notificaciones: campana habilitada, panel accesible (aria-expanded,
 *     región con nombre, Esc devuelve el foco), estado vacío.
 *  3. Toasts propios: aviso real al marcar favorito (role="status"),
 *     historial en la campana y cierre manual.
 *  4. Modal propio glass: el tour usa role="dialog" + aria-modal.
 * Requisitos: `npm run dev:app` + `npm run dev:server` y red (registro).
 * Uso: npm run verificar:ui-f6
 */
const { app, BrowserWindow } = require('electron');

app.disableHardwareAcceleration();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const API = 'http://localhost:3001/api';
const BASE = 'http://localhost:5173';

let fallos = 0;
const check = (nombre, cond, detalle = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? 'OK  ' : 'FALLO'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

app.whenReady().then(async () => {
  // Cuenta + receta propia (flujo real de notificación: marcar favorito)
  const correo = `ui-f6-${Date.now()}@sazonlab.test`;
  const reg = await fetch(`${API}/auth/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'UI Fase 6', correo, contrasena: 'clave-ui-123456' }),
  }).then((r) => r.json());
  check('registro de cuenta de prueba', Boolean(reg.token));

  const auth = JSON.stringify({ state: { token: reg.token, usuario: reg.usuario }, version: 0 });

  const creada = await fetch(`${API}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${reg.token}` },
    body: JSON.stringify({
      titulo: 'Notificaciones de prueba',
      descripcion: 'Para verificar los toasts',
      tiempo_min: 10,
      dificultad: 'facil',
      porciones: 2,
      ingredientes: [{ nombre: 'pan', cantidad: 2, unidad: 'unidades' }],
      pasos: [{ descripcion: 'Tostar el pan' }],
    }),
  }).then((r) => r.json());
  const idReceta = creada?.receta?.id;
  check('receta de prueba creada', Boolean(idReceta), `id=${idReceta}`);

  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  /** Abre una ruta con sesión inyectada y recarga (rehidratación). */
  const abrir = async (ruta, espera = 1600) => {
    await win.loadURL(`${BASE}/#${ruta}`);
    await dormir(700);
    await win.webContents.executeJavaScript(
      `localStorage.setItem('sazonlab-auth', ${JSON.stringify(auth)}); true;`,
    );
    await win.webContents.reload();
    await dormir(espera);
  };

  const js = (expr) => win.webContents.executeJavaScript(expr);

  // ── 1) Tour en la primera visita ──
  await win.loadURL(`${BASE}/`);
  await dormir(600);
  await js(
    `localStorage.removeItem('sazonlab-onboarding'); localStorage.removeItem('sazonlab-auth'); location.reload(); true`,
  );
  await dormir(2400);

  check(
    'el tour se abre en la primera visita',
    await js(
      `Boolean(document.querySelector('[role="dialog"][aria-labelledby="onboarding-titulo"]'))`,
    ),
  );
  check('tour: progreso «Paso 1 de 6»', await js(`/Paso 1 de 6/.test(document.body.textContent)`));
  check(
    'tour: «Omitir» siempre visible',
    await js(
      `[...document.querySelectorAll('button')].some(b => /Omitir tour/.test(b.textContent))`,
    ),
  );
  check(
    'tour: modal accesible (role=dialog + aria-modal)',
    await js(
      `(() => { const d = document.querySelector('[aria-labelledby="onboarding-titulo"]'); return d?.getAttribute('role') === 'dialog' && d?.getAttribute('aria-modal') === 'true'; })()`,
    ),
  );

  // Siguiente → paso 2 con anillo spotlight sobre el buscador
  await js(
    `[...document.querySelectorAll('button')].find(b => /Siguiente/.test(b.textContent))?.click(); true`,
  );
  await dormir(600);
  check('tour: avanza a «Paso 2 de 6»', await js(`/Paso 2 de 6/.test(document.body.textContent)`));
  check(
    'tour: anillo spotlight sobre el objetivo',
    await js(`Boolean(document.querySelector('div[style*="9999px"]'))`),
  );
  check(
    'tour: el objetivo real está marcado [data-tour]',
    await js(`Boolean(document.querySelector('[data-tour="buscador"]'))`),
  );

  // Omitir → persiste y cierra
  await js(
    `[...document.querySelectorAll('button')].find(b => /Omitir tour/.test(b.textContent))?.click(); true`,
  );
  await dormir(500);
  check(
    'tour: omitir cierra el diálogo',
    await js(`!document.querySelector('[aria-labelledby="onboarding-titulo"]')`),
  );
  check(
    'tour: omitir queda registrado (localStorage)',
    await js(`localStorage.getItem('sazonlab-onboarding') === 'visto'`),
  );

  // Recarga → no vuelve a molestarse
  await win.webContents.reload();
  await dormir(2400);
  check(
    'tour: no se repite en la siguiente visita',
    await js(`!document.querySelector('[aria-labelledby="onboarding-titulo"]')`),
  );

  // ── 2) Repetir tour desde Ajustes ──
  await abrir('/ajustes');
  check(
    'Ajustes ofrece «Repetir tour de bienvenida»',
    await js(
      `[...document.querySelectorAll('button')].some(b => /Repetir tour de bienvenida/.test(b.textContent))`,
    ),
  );
  await js(
    `[...document.querySelectorAll('button')].find(b => /Repetir tour de bienvenida/.test(b.textContent))?.click(); true`,
  );
  await dormir(700);
  check(
    'el tour vuelve a abrirse desde Ajustes',
    await js(
      `Boolean(document.querySelector('[role="dialog"][aria-labelledby="onboarding-titulo"]'))`,
    ),
  );
  await js(
    `[...document.querySelectorAll('button')].find(b => /Omitir tour/.test(b.textContent))?.click(); true`,
  );
  await dormir(400);

  // ── 3) Campana de notificaciones ──
  await abrir('/');
  const campana = `[data-tour="notificaciones"] button`;
  check(
    'campana habilitada (antes estaba deshabilitada)',
    await js(
      `(() => { const b = document.querySelector('${campana}'); return Boolean(b) && !b.disabled; })()`,
    ),
  );
  check(
    'campana con aria-expanded',
    await js(`document.querySelector('${campana}')?.getAttribute('aria-expanded') === 'false'`),
  );

  await js(`document.querySelector('${campana}')?.click(); true`);
  await dormir(500);
  check(
    'el panel de notificaciones abre',
    await js(`Boolean(document.getElementById('panel-notificaciones'))`),
  );
  check(
    'campana con aria-expanded=true al abrir',
    await js(`document.querySelector('${campana}')?.getAttribute('aria-expanded') === 'true'`),
  );
  check(
    'panel: estado vacío en español',
    await js(`/Sin notificaciones todavía/.test(document.body.textContent)`),
  );

  // Esc cierra y devuelve el foco a la campana
  await js(
    `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true`,
  );
  await dormir(400);
  check('Esc cierra el panel', await js(`!document.getElementById('panel-notificaciones')`));
  check(
    'Esc devuelve el foco a la campana',
    await js(`document.activeElement === document.querySelector('${campana}')`),
  );

  // ── 4) Toast propio con una acción real (marcar favorito) ──
  await abrir(`/receta/${idReceta}`);
  await js(
    `(() => { const b = [...document.querySelectorAll('button')].find(b => /^(Guardar|Guardada)$/.test(b.textContent.trim())); if (!b) return 'SIN BOTON'; b.click(); return 'ok'; })()`,
  );
  await dormir(900);

  check(
    'toast: aparece el aviso «Guardada en favoritos»',
    await js(`/Guardada en favoritos/.test(document.body.textContent)`),
  );
  check(
    'toast: es una región aria-live con role=status',
    await js(
      `(() => { const t = [...document.querySelectorAll('[role="status"]')].find(el => /Guardada en favoritos/.test(el.textContent)); return Boolean(t); })()`,
    ),
  );
  check(
    'toast: el contenedor está siempre montado (region con nombre)',
    await js(`Boolean(document.querySelector('[aria-label="Notificaciones"][role="region"]'))`),
  );
  check(
    'campana: badge de no leídas',
    await js(
      `(() => { const b = document.querySelector('${campana}'); return /sin leer/.test(b?.getAttribute('aria-label') || ''); })()`,
    ),
  );

  // El historial de la campana recoge la notificación
  await js(`document.querySelector('${campana}')?.click(); true`);
  await dormir(500);
  check(
    'campana: el historial lista la notificación',
    await js(
      `(() => { const p = document.getElementById('panel-notificaciones'); return Boolean(p) && /Guardada en favoritos/.test(p.textContent); })()`,
    ),
  );
  check(
    'campana: muestra el tiempo en español',
    await js(
      `(() => { const p = document.getElementById('panel-notificaciones'); return Boolean(p) && /ahora|hace \\d+/.test(p.textContent); })()`,
    ),
  );
  await js(
    `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true`,
  );
  await dormir(300);

  // Cierre manual del toast
  check(
    'toast: botón de cerrar etiquetado',
    await js(
      `Boolean([...document.querySelectorAll('button')].find(b => /Cerrar notificación:/.test(b.getAttribute('aria-label') || '')))`,
    ),
  );
  await js(
    `[...document.querySelectorAll('button')].find(b => /Cerrar notificación:/.test(b.getAttribute('aria-label') || ''))?.click(); true`,
  );
  await dormir(400);
  check(
    'toast: el cierre manual lo elimina',
    await js(`!/Guardada en favoritos/.test(document.body.textContent)`),
  );

  console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLO(S)`);
  app.exit(fallos === 0 ? 0 : 1);
});

process.on('unhandledRejection', (err) => {
  console.error('FATAL:', err.message);
  app.exit(1);
});
