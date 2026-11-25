/**
 * Verificación UI del panel del chef y de la carta digital (puntos 3, 4 y 6).
 * - Admin crea un chef; el chef crea una receta con alérgenos detectados y
 *   la agrega a su carta con precio.
 * - Panel del chef: plato, precio, alérgenos y modal de personalización.
 * - Carta pública: nombre del establecimiento, leyenda, filtro del comensal
 *   (oculta platos con el alérgeno marcado) y opción sin precio.
 * Requisitos: `npm run dev:app` + `npm run dev:server`.
 * Uso: npm run verificar:carta
 */
const { app, BrowserWindow } = require('electron');

app.disableHardwareAcceleration();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const API = 'http://localhost:3001/api';

let fallos = 0;
const check = (nombre, cond, detalle = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? 'OK  ' : 'FALLO'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

async function pedir(metodo, ruta, { token, body } = {}) {
  const r = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let datos = null;
  try {
    datos = await r.json();
  } catch {
    // Sin cuerpo JSON: se informa solo con el status.
  }
  return { status: r.status, datos };
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  const admin = await pedir('POST', '/auth/login', {
    body: { correo: 'admin@sazonlab.test', contrasena: 'admin1234' },
  });
  check('login admin', admin.status === 200 && Boolean(admin.datos?.token));
  if (!admin.datos?.token) return app.quit();

  const correo = `ui-carta-${Date.now()}@sazonlab.test`;
  const creado = await pedir('POST', '/admin/usuarios', {
    token: admin.datos.token,
    body: { nombre: 'Chef Carta', correo, contrasena: 'clave-carta-123', rol: 'chef' },
  });
  check('admin crea chef', creado.status === 201, `status=${creado.status}`);
  const chef = await pedir('POST', '/auth/login', {
    body: { correo, contrasena: 'clave-carta-123' },
  });
  check('login chef', chef.status === 200 && Boolean(chef.datos?.token));
  const token = chef.datos?.token;
  const idChef = chef.datos?.usuario?.id;

  // Receta con harina/huevo => gluten + huevo precargados por la API.
  const receta = await pedir('POST', '/recipes', {
    token,
    body: {
      titulo: 'Tarta QA carta',
      ingredientes: [
        { nombre: 'Harina de trigo', cantidad: 2, unidad: 'tazas' },
        { nombre: 'Huevo', cantidad: 3, unidad: 'unidades' },
      ],
      pasos: [{ descripcion: 'Hornear' }],
    },
  });
  check('receta creada con alérgenos', receta.status === 201, `status=${receta.status}`);
  const alergenos = receta.datos?.receta?.alergenos || [];
  check('precarga gluten desde ingredientes', alergenos.includes('gluten'), alergenos.join(','));
  check('precarga huevo desde ingredientes', alergenos.includes('huevo'), alergenos.join(','));

  const plato = await pedir('POST', '/carta/platos', {
    token,
    body: { receta_id: receta.datos?.receta?.id, precio: 18.5, categoria: 'Postres' },
  });
  check('plato agregado a la carta', plato.status === 201, `status=${plato.status}`);

  const prefs = await pedir('PUT', '/carta/preferencias', {
    token,
    body: {
      nombre_establecimiento: 'La Cocina QA',
      color_principal: '#ff6600',
      version: 'con_precio',
      mostrar_alergenos: true,
      mostrar_composicion: true,
    },
  });
  check('preferencias guardadas', prefs.status === 200);

  const sesion = JSON.stringify(
    JSON.stringify({ state: { token, usuario: chef.datos.usuario }, version: 0 }),
  );

  const abrir = async (ruta, { invitado = false, recargar = true } = {}) => {
    await win.loadURL(`http://localhost:5173/#${ruta}`);
    await dormir(500);
    const expr = invitado
      ? `localStorage.removeItem('sazonlab-auth'); true;`
      : `localStorage.setItem('sazonlab-auth', ${sesion}); true;`;
    await win.webContents.executeJavaScript(expr);
    if (recargar) {
      await win.webContents.reload();
      await dormir(2200);
    }
  };
  const leer = (expr) => win.webContents.executeJavaScript(expr);

  // Panel del chef
  await abrir('/chef');
  let texto = await leer('document.body.innerText');
  check('panel: título del panel', /Panel del chef/i.test(texto));
  check('panel: plato con precio', /18[,.]50/.test(texto));
  check('panel: alérgenos visibles', /Gluten/i.test(texto) && /Huevo/i.test(texto));
  check('panel: botón de personalizar', /Personalizar carta/i.test(texto));

  // Modal de personalización con vista previa en vivo
  await leer(
    `(() => { const b = [...document.querySelectorAll('button')].find(b => /Personalizar carta/i.test(b.textContent)); b?.click(); return true; })()`,
  );
  await dormir(1800);
  texto = await leer('document.body.innerText');
  check('personalización: vista previa en vivo', /Vista previa en vivo/i.test(texto));
  check('personalización: controles de carta', /Orientación/i.test(texto) && /Tipografía/i.test(texto) && /Tamaño/i.test(texto));
  check('personalización: exportación PDF e imagen', /Exportar PDF/i.test(texto) && /Exportar imagen/i.test(texto));

  // Generador de QR (punto 7)
  await leer(
    `(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cerrar'); b?.click(); return true; })()`,
  );
  await dormir(500);
  await leer(
    `(() => { const b = [...document.querySelectorAll('button')].find(b => /Generar QR/i.test(b.textContent)); b?.click(); return true; })()`,
  );
  await dormir(2200);
  texto = await leer('document.body.innerText');
  check('QR: modal con formatos PNG/SVG/PDF', /Código QR de mi carta/i.test(texto) && /Descargar PNG/i.test(texto) && /Descargar SVG/i.test(texto) && /Guardar PDF/i.test(texto));
  check('QR: opciones de color, tamaño, logo y marco', /Color del QR/i.test(texto) && /Tamaño/i.test(texto) && /Logo central/i.test(texto) && /Mostrar marco/i.test(texto));
  const previewQR = await leer(`Boolean(document.querySelector('img[alt="Vista previa del código QR"]'))`);
  check('QR: vista previa generada', previewQR === true);

  // Carta pública (sin sesión)
  await abrir(`/carta/${idChef}`, { invitado: true });
  texto = await leer('document.body.innerText');
  check('carta pública: nombre del establecimiento', /La Cocina QA/i.test(texto));
  check('carta pública: plato y precio', /Tarta QA carta/i.test(texto) && /18\.50/.test(texto));
  check('carta pública: leyenda de alérgenos', /Leyenda de alérgenos/i.test(texto));
  check('carta pública: filtro del comensal', /Mis alergias/i.test(texto));

  // Marcar "Gluten" en el filtro => el plato desaparece
  await leer(
    `(() => { const l = [...document.querySelectorAll('label')].find(l => /Gluten/i.test(l.textContent) && l.querySelector('input[type=checkbox]')); l?.querySelector('input')?.click(); return true; })()`,
  );
  await dormir(1800);
  texto = await leer('document.body.innerText');
  check('filtro comensal oculta el plato con gluten', !/Tarta QA carta/i.test(texto));

  // Quitar filtro => vuelve el plato
  await leer(
    `(() => { const b = [...document.querySelectorAll('button')].find(b => /Quitar filtro/i.test(b.textContent)); b?.click(); return true; })()`,
  );
  await dormir(1800);
  texto = await leer('document.body.innerText');
  check('filtro se puede quitar', /Tarta QA carta/i.test(texto));

  const sinPrecio = await pedir('GET', `/carta/publica/${idChef}?con_precio=0`);
  check(
    'carta pública sin precio (API)',
    sinPrecio.status === 200 && sinPrecio.datos?.platos?.[0]?.precio === null,
    `status=${sinPrecio.status}`,
  );

  // Medidas en el menú lateral (todos los usuarios)
  check(
    'menú lateral: Medidas visible para invitado',
    (await leer(
      `[...document.querySelectorAll('#sidebar-principal a')].some(a => a.textContent.includes('Medidas y equivalencias'))`,
    )) === true,
  );

  // Chat flotante separado del Asistente
  const rutaAntes = await leer('location.hash');
  await leer(
    `(() => { const b = document.querySelector('button[aria-label="Abrir chat de cocina"]'); b?.click(); return true; })()`,
  );
  await dormir(800);
  check(
    'chat flotante: se abre sin ir a /chat',
    (await leer(`Boolean(document.querySelector('section[aria-label="Chat flotante de SazónLab"]'))`)) === true &&
      (await leer('location.hash')) === rutaAntes,
  );
  check(
    'chat flotante: tiene su propio input',
    (await leer(`Boolean(document.querySelector('#chat-flotante-input'))`)) === true,
  );

  // Menú desplegable de descargas en el detalle de receta
  await abrir(`/receta/${receta.datos?.receta?.id}`);
  texto = await leer('document.body.innerText');
  check('detalle: receta cargada', /Tarta QA carta/i.test(texto));
  await leer(
    `(() => { const b = [...document.querySelectorAll('button')].find(b => /Descargar/i.test(b.textContent) && b.getAttribute('aria-haspopup') === 'menu'); b?.click(); return true; })()`,
  );
  await dormir(600);
  check(
    'descargas: menú con PDF e imagen',
    (await leer(`[...document.querySelectorAll('[role=menuitem]')].map(e => e.textContent).join('|')`)).includes('PDF') &&
      (await leer(`[...document.querySelectorAll('[role=menuitem]')].map(e => e.textContent).join('|')`)).includes('Imagen'),
  );

  console.log(`\n${fallos === 0 ? 'TODO OK' : `${fallos} FALLO(S)`}`);
  await dormir(300);
  app.quit();
  process.exitCode = fallos === 0 ? 0 : 1;
});
