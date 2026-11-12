/**
 * Verificación de accesibilidad (WCAG 2.1 AA) con axe-core — Fase 6
 * (Sprint 7 IEEE, Hito 8: «WCAG 2.1 AA cumplido»).
 *
 * Recorre páginas clave + diálogos (selector de tema, compartir, tour de
 * bienvenida, panel de notificaciones) en un Chromium real (Electron) y
 * ejecuta axe con las etiquetas WCAG 2.0/2.1 A y AA.
 *
 * Requisitos: `npm run dev:app` + `npm run dev:server` y red.
 * Uso: npm run verificar:a11y
 * Salida: consola + informe `docs/evidencias/a11y-axe.md`.
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
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

/** Ejecuta axe en la página actual y devuelve {violaciones, error}. */
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
  // Receta pública de TheMealDB para el detalle/compartir
  const busq = await fetch(`${API}/search?q=chicken`).then((r) => r.json());
  const idReceta = busq.recetas[0].id;

  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  const resultados = [];

  /** Abre una ruta (sin sesión) y espera a que esté estable. */
  const abrir = async (ruta, espera = 1400) => {
    await win.loadURL(`${BASE}/#${ruta}`);
    await dormir(espera);
  };

  // ── 1) Home con el tour de bienvenida abierto (primera visita) ──
  // Limpia la marca de «visto» y recarga: el localStorage de Electron
  // persiste entre ejecuciones del script.
  await win.loadURL(`${BASE}/`);
  await dormir(600);
  await win.webContents.executeJavaScript(
    `localStorage.removeItem('sazonlab-onboarding'); location.reload(); true`,
  );
  await dormir(2400);
  let hayTour = await win.webContents.executeJavaScript(
    `Boolean(document.querySelector('[role="dialog"][aria-labelledby="onboarding-titulo"]'))`,
  );
  check('el tour de bienvenida se abre en la primera visita', hayTour);
  resultados.push(await ejecutarAxe(win, 'Home + tour de bienvenida (RF-25)'));

  // Cierra el tour («Omitir»)
  await win.webContents.executeJavaScript(
    `(() => { const b = [...document.querySelectorAll('button')].find(b => /Omitir tour/.test(b.textContent)); b?.click(); return Boolean(b); })()`,
  );
  await dormir(500);

  // ── 2) Páginas principales ──
  const paginas = [
    ['/', 'Home (invitado)'],
    ['/buscar?q=pollo', 'Buscar con resultados'],
    [`/receta/${idReceta}`, 'Detalle de receta (pública)'],
    ['/login', 'Iniciar sesión'],
    ['/ajustes', 'Ajustes (accesibilidad)'],
    ['/medidas', 'Medidas y conversor'],
    ['/libro', 'Libro de cocina'],
  ];
  for (const [ruta, etiqueta] of paginas) {
    await abrir(ruta);
    resultados.push(await ejecutarAxe(win, etiqueta));
  }

  // ── 3) Selector de tema (modal glass) ──
  await abrir('/');
  await win.webContents.executeJavaScript(
    `(() => { const b = document.querySelector('[aria-label="Abrir selector de tema y modo"]'); b?.click(); return Boolean(b); })()`,
  );
  await dormir(700);
  check(
    'selector de tema abierto',
    await win.webContents.executeJavaScript(
      `Boolean(document.querySelector('[aria-labelledby="theme-selector-title"]'))`,
    ),
  );
  resultados.push(await ejecutarAxe(win, 'Selector de tema (modal glass)'));
  await win.webContents.executeJavaScript(
    `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`,
  );
  await dormir(400);

  // ── 4) Panel de notificaciones (campana) ──
  // Genera una notificación con el servicio propio y abre el panel
  await win.webContents.executeJavaScript(
    `import('/src/services/toast.js').then(m => m.exito('Receta guardada')).catch(() => null)`,
  );
  await dormir(600);
  await win.webContents.executeJavaScript(
    `(() => { const b = document.querySelector('[data-tour="notificaciones"] button'); b?.click(); return Boolean(b); })()`,
  );
  await dormir(500);
  check(
    'panel de notificaciones abierto',
    await win.webContents.executeJavaScript(
      `Boolean(document.getElementById('panel-notificaciones'))`,
    ),
  );
  resultados.push(await ejecutarAxe(win, 'Panel de notificaciones (campana)'));
  await win.webContents.executeJavaScript(
    `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`,
  );
  await dormir(300);

  // ── 5) Diálogo de compartir (SweetAlert2 glass) ──
  await abrir(`/receta/${idReceta}`, 1800);
  await win.webContents.executeJavaScript(
    `(() => { const b = [...document.querySelectorAll('button')].find(b => /Compartir/.test(b.textContent)); b?.click(); return Boolean(b); })()`,
  );
  await dormir(900);
  check(
    'diálogo de compartir abierto',
    await win.webContents.executeJavaScript(
      `Boolean(document.querySelector('[data-accion="imagen"]'))`,
    ),
  );
  resultados.push(await ejecutarAxe(win, 'Diálogo de compartir (SweetAlert2 glass)'));
  await win.webContents.executeJavaScript(
    `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`,
  );
  await dormir(300);

  // ── Informe ──
  const criticos = [];
  for (const r of resultados) {
    if (r.error) {
      console.log(`ERROR  ${r.etiqueta}: ${r.error}`);
      fallos++;
      continue;
    }
    const malos = r.violaciones.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    const menores = r.violaciones.filter((v) => v.impact !== 'serious' && v.impact !== 'critical');
    if (malos.length > 0) criticos.push({ ...r, violaciones: malos });
    const resumen =
      r.violaciones.length === 0
        ? 'sin violaciones'
        : `${r.violaciones.length} (leves: ${menores.length}, serias: ${malos.length})`;
    console.log(`${malos.length === 0 ? 'OK  ' : 'FALLO'} axe · ${r.etiqueta} — ${resumen}`);
    for (const v of r.violaciones) {
      console.log(`      · [${v.impact}] ${v.id}: ${v.ayuda} — nodos=${v.nodos} ${v.ejemplo}`);
    }
  }
  if (criticos.length > 0) fallos++;

  // Documento de evidencia
  const lineas = [
    '# Evidencia — axe-core WCAG 2.1 AA (Fase 6)',
    '',
    `**Fecha:** ${new Date().toISOString().slice(0, 10)}`,
    '**Herramienta:** axe-core (etiquetas wcag2a, wcag2aa, wcag21a, wcag21aa) sobre Chromium (Electron)',
    '**Criterio de fallo:** cualquier violación de impacto `serious` o `critical`.',
    '',
    '| Estado analizado | Violaciones | Sin serias/críticas |',
    '|------------------|-------------|---------------------|',
  ];
  for (const r of resultados) {
    if (r.error) {
      lineas.push(`| ${r.etiqueta} | ERROR: ${r.error} | — |`);
      continue;
    }
    const malos = r.violaciones.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    lineas.push(
      `| ${r.etiqueta} | ${r.violaciones.length} | ${malos.length === 0 ? '✅' : `❌ ${malos.length}`} |`,
    );
  }
  lineas.push('', '## Detalle', '');
  for (const r of resultados) {
    lineas.push(`### ${r.etiqueta}`, '');
    if (r.error) {
      lineas.push(`- ERROR: ${r.error}`, '');
      continue;
    }
    if (r.violaciones.length === 0) {
      lineas.push('- Sin violaciones ✅', '');
      continue;
    }
    for (const v of r.violaciones) {
      lineas.push(
        `- \`${v.id}\` [${v.impact}] ${v.ayuda} — nodos=${v.nodos}${v.ejemplo ? ` — \`${v.ejemplo}\`` : ''}`,
      );
    }
    lineas.push('');
  }
  const destino = path.join(__dirname, '..', 'docs', 'evidencias', 'a11y-axe.md');
  fs.writeFileSync(destino, lineas.join('\n'), 'utf8');
  console.log(`\nInforme: ${destino}`);

  check(
    'sin violaciones serious/critical en axe',
    criticos.length === 0,
    `${criticos.length} estados con violaciones graves`,
  );
  console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLO(S)`);
  app.exit(fallos === 0 ? 0 : 1);
});

process.on('unhandledRejection', (err) => {
  console.error('FATAL:', err.message);
  app.exit(1);
});
