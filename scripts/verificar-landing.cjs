/**
 * Verificación de la Landing oficial — Fase 7 (Sprint 10 IEEE, Hito 11).
 *
 * 1. Landing home: estructura semántica, secciones (hero con captura real,
 *    «Cómo funciona», funciones, descarga), enlaces reales (demo + .exe).
 * 2. Vistas legales por hash (#/privacidad, #/terminos) con contenido.
 * 3. SEO: robots.txt servido + JSON-LD en el HTML + lang="es".
 * 4. Páginas legales de la APP (/privacidad, /terminos) y sus enlaces del pie.
 * 5. axe-core (WCAG 2.1 AA) sobre landing home, ambos legales y app legal.
 *
 * Requisitos: `npm run dev:landing` (5174), `npm run dev:app` (5173) y
 * `npm run dev:server` (3001).
 * Uso: npm run verificar:landing
 */
const { app, BrowserWindow } = require('electron');
const axe = require('axe-core');

app.disableHardwareAcceleration();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const LANDING = 'http://localhost:5174';
const APP = 'http://localhost:5173';

let fallos = 0;
const check = (nombre, cond, detalle = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? 'OK  ' : 'FALLO'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

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
  const resultados = [];
  const js = (win, expr) => win.webContents.executeJavaScript(expr, true);

  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  // ── 1) Landing home ──
  await win.loadURL(`${LANDING}/`);
  await dormir(1800);

  check('landing carga (200)', (await js(win, 'document.title')).includes('SazónLab'));
  check(
    'estructura semántica header/main/footer',
    await js(
      win,
      `Boolean(document.querySelector('header')) && Boolean(document.querySelector('main')) && Boolean(document.querySelector('footer'))`,
    ),
  );
  check('html lang="es"', await js(win, `document.documentElement.lang === 'es'`));
  check('skip-link presente', await js(win, `Boolean(document.querySelector('.skip-link'))`));

  // Secciones
  for (const [id, nombre] of [
    ['hero-titulo', 'hero'],
    ['pasos-titulo', '«¿Cómo funciona?»'],
    ['funciones-titulo', 'funciones'],
    ['descarga-titulo', 'descarga'],
  ]) {
    check(`sección ${nombre}`, await js(win, `Boolean(document.getElementById('${id}'))`));
  }
  check(
    'captura real de la app en el hero',
    await js(
      win,
      `(() => { const img = [...document.querySelectorAll('img')].find(i => /captura-app/.test(i.src)); return Boolean(img) && img.naturalWidth > 0; })()`,
    ),
  );
  check(
    'la captura tiene alt descriptivo',
    await js(
      win,
      `(() => { const img = [...document.querySelectorAll('img')].find(i => /captura-app/.test(i.src)); return Boolean(img) && img.alt.length > 30; })()`,
    ),
  );
  check(
    '3 pasos en «Cómo funciona»',
    await js(win, `document.querySelectorAll('#como-funciona li').length === 3`),
  );
  check(
    '6 funciones en tarjetas',
    await js(win, `document.querySelectorAll('#funciones li').length === 6`),
  );

  // Enlaces reales
  const demoHref = await js(win, `document.getElementById('demo')?.href || ''`);
  check('enlace demo → http://localhost:5173/', demoHref === 'http://localhost:5173/', demoHref);
  const exeHref = await js(
    win,
    `[...document.querySelectorAll('a')].find(a => /Descargar \\.exe/.test(a.textContent))?.getAttribute('href') || ''`,
  );
  check(
    'enlace .exe → ./SazónLab-Setup-1.0.0.exe',
    exeHref === './SazónLab-Setup-1.0.0.exe',
    exeHref,
  );

  // Navegación de anclas del header (sin enlaces muertos)
  const hrefsVivos = await js(
    win,
    `[...document.querySelectorAll('a')].filter(a => a.getAttribute('href') === '#').length`,
  );
  check('sin enlaces muertos href="#"', hrefsVivos === 0, `encontrados=${hrefsVivos}`);

  check(
    'footer con Privacidad y Términos',
    await js(
      win,
      `(() => { const f = document.querySelector('footer'); return Boolean(f) && /Privacidad/.test(f.textContent) && /Términos/.test(f.textContent); })()`,
    ),
  );

  resultados.push(await ejecutarAxe(win, 'Landing — inicio'));

  // ── 2) Vistas legales por hash ──
  await js(win, `location.hash = '#/privacidad'; true`);
  await dormir(900);
  check(
    'vista #/privacidad renderiza',
    await js(win, `/Política de privacidad/.test(document.body.textContent)`),
  );
  check(
    'privacidad: datos, terceros y derechos',
    await js(
      win,
      `/bcrypt/.test(document.body.textContent) && /TheMealDB/.test(document.body.textContent) && /derechos/i.test(document.body.textContent)`,
    ),
  );
  resultados.push(await ejecutarAxe(win, 'Landing — Política de privacidad'));

  await js(win, `location.hash = '#/terminos'; true`);
  await dormir(900);
  check(
    'vista #/terminos renderiza',
    await js(win, `/Términos del servicio/.test(document.body.textContent)`),
  );
  check(
    'términos: uso, IA y responsabilidad',
    await js(
      win,
      `/Inteligencia artificial|IA/.test(document.body.textContent) && /responsabilidad/i.test(document.body.textContent)`,
    ),
  );
  resultados.push(await ejecutarAxe(win, 'Landing — Términos del servicio'));

  // Volver al inicio desde el legal
  await js(win, `location.hash = '#/'; true`);
  await dormir(900);
  check(
    'volver al inicio desde el legal',
    await js(win, `Boolean(document.getElementById('hero-titulo'))`),
  );

  // ── 3) SEO ──
  const robots = await fetch(`${LANDING}/robots.txt`);
  const textoRobots = await robots.text();
  check('robots.txt servido (200)', robots.status === 200);
  check(
    'robots.txt permite rastreo',
    /User-agent: \*/.test(textoRobots) && /Allow: \//.test(textoRobots),
  );
  const htmlCrudo = await (await fetch(`${LANDING}/`)).text();
  check(
    'JSON-LD presente (SoftwareApplication)',
    /application\/ld\+json/.test(htmlCrudo) && /SoftwareApplication/.test(htmlCrudo),
  );
  check(
    'meta description en español',
    /name="description"/.test(htmlCrudo) && /recetas/i.test(htmlCrudo),
  );
  check('Open Graph + twitter:card', /og:title/.test(htmlCrudo) && /twitter:card/.test(htmlCrudo));

  // ── 4) Páginas legales en la APP ──
  await win.loadURL(`${APP}/#/privacidad`);
  await dormir(1600);
  check(
    'app: /privacidad renderiza',
    await js(win, `/Política de privacidad/.test(document.body.textContent)`),
  );
  check(
    'app: pie con enlaces vivos a legales',
    await js(
      win,
      `(() => { const btns = [...document.querySelectorAll('footer button')]; return btns.some(b => b.textContent.trim() === 'Privacidad') && btns.some(b => b.textContent.trim() === 'Términos'); })()`,
    ),
  );
  resultados.push(await ejecutarAxe(win, 'App — /privacidad'));

  // El pie navega de verdad (botón → ruta)
  await js(
    win,
    `(() => { const b = [...document.querySelectorAll('footer button')].find(b => b.textContent.trim() === 'Términos'); b?.click(); return Boolean(b); })()`,
  );
  await dormir(900);
  check(
    'app: el pie navega a /terminos',
    await js(win, `/Términos del servicio/.test(document.body.textContent)`),
  );
  resultados.push(await ejecutarAxe(win, 'App — /terminos'));

  // ── Informe axe ──
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
    for (const v of r.violaciones) {
      console.log(`      · [${v.impact}] ${v.id}: ${v.ayuda} — nodos=${v.nodos} ${v.ejemplo}`);
    }
  }
  check(
    'axe: 0 violaciones serious/critical en landing + legales',
    criticos.length === 0,
    criticos.join(', '),
  );

  // ── Capturas de evidencia (Fase 7) ──
  try {
    const fs = require('fs');
    const path = require('path');
    const destino = path.join(__dirname, '..', 'docs', 'evidencias');
    await win.loadURL(`${LANDING}/`);
    await dormir(1600);
    fs.writeFileSync(
      path.join(destino, 'landing-01-inicio.png'),
      (await win.webContents.capturePage()).toPNG(),
    );
    await js(win, `location.hash = '#/privacidad'; true`);
    await dormir(900);
    fs.writeFileSync(
      path.join(destino, 'landing-02-privacidad.png'),
      (await win.webContents.capturePage()).toPNG(),
    );
    await win.loadURL(`${APP}/#/terminos`);
    await dormir(1500);
    fs.writeFileSync(
      path.join(destino, 'app-05-terminos.png'),
      (await win.webContents.capturePage()).toPNG(),
    );
    console.log('Capturas: landing-01-inicio.png, landing-02-privacidad.png, app-05-terminos.png');
  } catch (err) {
    console.log(`Aviso: no se pudieron capturar imágenes — ${err.message}`);
  }

  console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLO(S)`);
  app.exit(fallos === 0 ? 0 : 1);
});

process.on('unhandledRejection', (err) => {
  console.error('FATAL:', err.message);
  app.exit(1);
});
