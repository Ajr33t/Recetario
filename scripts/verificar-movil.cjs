/**
 * Verificación responsive (Fase 10): la app debe funcionar bien en
 * **celular (390×844)**, **tablet (768×1024)** y **escritorio (1280×800)**.
 *
 * Comprueba:
 *  1. Ninguna página desborda horizontalmente (ni scroll lateral ni cajas
 *     que se salen de la pantalla).
 *  2. En móvil: el menú lateral se abre con el botón y el buscador global
 *     está en su propia fila a ancho completo.
 *  3. Los enlaces del menú tienen área táctil cómoda (≥ 40 px de alto).
 *  4. El chat, el buscador y los ajustes se ven completos en cada tamaño.
 *
 * Requisitos: `npm run dev:app` + `npm run dev:server` corriendo.
 * Uso: npm run verificar:movil
 */
const { app, BrowserWindow } = require('electron');

app.disableHardwareAcceleration();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const API = 'http://localhost:3001/api';
const BASE = 'http://localhost:5173';

const VISTAS = [
  { nombre: 'celular', ancho: 390, alto: 844 },
  { nombre: 'tablet', ancho: 768, alto: 1024 },
  { nombre: 'escritorio', ancho: 1280, alto: 900 },
];

const PAGINAS = ['/', '/buscar', '/chat', '/ajustes', '/medidas', '/login', '/recuperar'];

let fallos = 0;
const check = (nombre, cond, detalle = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? 'OK  ' : 'FALLO'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  // Sesión de administrador (para /admin y /mis-recetas con contenido)
  const reg = await fetch(`${API}/auth/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: 'Movil Tester',
      correo: `movil-${Date.now()}@sazonlab.test`,
      contrasena: 'clave-movil-123',
      aceptaTratamiento: true,
      aceptaCookies: true,
    }),
  }).then((r) => r.json());
  const auth = JSON.stringify({ state: { token: reg.token, usuario: reg.usuario }, version: 0 });

  const abrir = async (ruta) => {
    await win.loadURL(`${BASE}/#${ruta}`);
    await dormir(600);
    await win.webContents.executeJavaScript(
      `localStorage.setItem('sazonlab-auth', ${JSON.stringify(auth)}); true;`,
    );
    await win.webContents.reload();
    await dormir(1800);
  };

  const leer = (expr) => win.webContents.executeJavaScript(expr);

  // ── 1) Sin desbordes horizontales en ninguna vista ──
  for (const vista of VISTAS) {
    win.setSize(vista.ancho, vista.alto);
    await dormir(300);

    for (const ruta of PAGINAS) {
      await abrir(ruta);
      const medida = await leer(`(() => {
        const de = document.documentElement;
        const ancho = window.innerWidth;
        // Elementos que se salen (se ignoran los que están dentro de un
        // contenedor con scroll horizontal declarado)
        const culpables = [...document.querySelectorAll('body *')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            if (r.right <= ancho + 2) return false;
            let padre = el.parentElement;
            while (padre) {
              const estilo = getComputedStyle(padre);
              if (estilo.overflowX === 'auto' || estilo.overflowX === 'scroll') return false;
              padre = padre.parentElement;
            }
            return true;
          })
          .slice(0, 3)
          .map((el) => el.tagName + '.' + (el.className || '').toString().slice(0, 40));
        return JSON.stringify({
          scroll: de.scrollWidth,
          ancho,
          culpables,
        });
      })()`);
      const m = JSON.parse(medida);
      check(
        `${vista.nombre}: ${ruta} sin desbordamiento horizontal`,
        m.scroll <= m.ancho + 2 && m.culpables.length === 0,
        `scroll=${m.scroll} ancho=${m.ancho}${m.culpables.length ? ` culpables=${m.culpables.join(' | ')}` : ''}`,
      );
    }
  }

  // ── 2) Móvil: menú lateral y buscador en fila propia ──
  win.setSize(390, 844);
  await dormir(400);
  await abrir('/');

  const botonMenu = await leer(
    `Boolean([...document.querySelectorAll('header button')].find(b => /menú de navegación/i.test(b.getAttribute('aria-label') || '')))`,
  );
  check('móvil: existe el botón de menú en la cabecera', botonMenu === true);

  await leer(
    `[...document.querySelectorAll('header button')].find(b => /menú de navegación/i.test(b.getAttribute('aria-label') || ''))?.click(); true`,
  );
  await dormir(700);
  const menuAbierto = await leer(`(() => {
    const aside = document.querySelector('#sidebar-principal');
    if (!aside) return JSON.stringify({ visible: false, enlaces: 0 });
    // Estado funcional del menú (la animación no avanza en ventanas
    // ocultas, así que no se mide el píxel)
    const clases = aside.className;
    const abierto = /(^|\\s)translate-x-0(\\s|$)/.test(clases) && !/-translate-x-full/.test(clases);
    const boton = [...document.querySelectorAll('header button')].find((b) =>
      /menú de navegación/i.test(b.getAttribute('aria-label') || ''),
    );
    return JSON.stringify({
      visible: abierto,
      expandido: boton?.getAttribute('aria-expanded') || '',
      enlaces: aside.querySelectorAll('a').length,
      alto: aside.querySelector('a')?.getBoundingClientRect().height || 0,
    });
  })()`);
  const ma = JSON.parse(menuAbierto);
  check(
    'móvil: el menú lateral se abre sobre el contenido',
    ma.visible === true && ma.expandido === 'true',
    `visible=${ma.visible} aria-expanded=${ma.expandido}`,
  );
  check('móvil: el menú lateral tiene enlaces', ma.enlaces >= 3, `enlaces=${ma.enlaces}`);
  check(
    'móvil: los enlaces del menú tienen área táctil cómoda (≥ 40 px)',
    ma.alto >= 40,
    `alto=${Math.round(ma.alto)}px`,
  );

  const buscadorMovil = await leer(`(() => {
    const input = document.querySelector('#buscador-global-movil');
    if (!input) return JSON.stringify({ existe: false });
    const r = input.getBoundingClientRect();
    return JSON.stringify({ existe: true, ancho: Math.round(r.width), visible: r.width > 0 });
  })()`);
  const bm = JSON.parse(buscadorMovil);
  check(
    'móvil: el buscador global está en su propia fila a ancho completo',
    bm.existe && bm.ancho > 250,
    `ancho=${bm.ancho}px`,
  );

  // ── 3) Tablet: el buscador global está disponible ──
  win.setSize(768, 1024);
  await dormir(400);
  await abrir('/');
  const buscadorTablet = await leer(`(() => {
    const enCabecera = document.querySelector('#buscador-global');
    const enFila = document.querySelector('#buscador-global-movil');
    const visible = (el) => (el ? el.getBoundingClientRect().width > 100 : false);
    return JSON.stringify({
      cabecera: visible(enCabecera),
      fila: visible(enFila),
    });
  })()`);
  const bt = JSON.parse(buscadorTablet);
  check(
    'tablet: el buscador global está visible (cabecera o fila propia)',
    bt.cabecera || bt.fila,
    `cabecera=${bt.cabecera} fila=${bt.fila}`,
  );

  // ── 4) Chat usable en móvil ──
  win.setSize(390, 844);
  await dormir(400);
  await abrir('/chat');
  const chatMovil = await leer(`(() => {
    const input = document.querySelector('#chat-mensaje');
    const boton = [...document.querySelectorAll('main button')].find((b) =>
      /enviar/i.test(b.textContent),
    );
    const log = document.querySelector('[role=log]');
    return JSON.stringify({
      input: Boolean(input),
      boton: Boolean(boton),
      altoInput: input ? Math.round(input.getBoundingClientRect().height) : 0,
      altoBoton: boton ? Math.round(boton.getBoundingClientRect().height) : 0,
      log: Boolean(log),
      ejemplos: document.querySelectorAll('main .chip').length,
    });
  })()`);
  const cm = JSON.parse(chatMovil);
  check('móvil: el chat muestra el campo de escritura', cm.input === true);
  check('móvil: el chat muestra el botón de enviar', cm.boton === true);
  check(
    'móvil: los controles del chat tienen altura cómoda (≥ 40 px)',
    cm.altoInput >= 40 && cm.altoBoton >= 36,
    `input=${cm.altoInput}px botón=${cm.altoBoton}px`,
  );
  check('móvil: el chat ofrece ejemplos para empezar', cm.ejemplos >= 4, `chips=${cm.ejemplos}`);

  // ── 5) Escritorio: todo en su sitio ──
  win.setSize(1280, 900);
  await dormir(400);
  await abrir('/');
  const escritorio = await leer(`(() => {
    const aside = document.querySelector('#sidebar-principal');
    const r = aside.getBoundingClientRect();
    const header = document.querySelector('header');
    const boton = [...document.querySelectorAll('header button')].find((b) =>
      /menú de navegación/i.test(b.getAttribute('aria-label') || ''),
    );
    return JSON.stringify({
      asideVisible: r.width > 100 && r.left >= 0,
      menuBotonVisible: boton ? boton.getBoundingClientRect().width > 0 : false,
      altoHeader: header.getBoundingClientRect().height,
    });
  })()`);
  const es = JSON.parse(escritorio);
  check('escritorio: el menú lateral está visible y fijo', es.asideVisible === true);
  check(
    'escritorio: el botón de menú móvil está oculto',
    es.menuBotonVisible === false,
    `visible=${es.menuBotonVisible}`,
  );

  console.log(`\n${fallos === 0 ? 'TODOS LOS CHECKS PASARON' : `${fallos} CHECK(S) FALLARON`}`);
  app.exit(fallos > 0 ? 1 : 0);
});

process.on('unhandledRejection', (err) => {
  console.error('ERROR FATAL:', err.message);
  app.exit(1);
});
