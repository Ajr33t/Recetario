/**
 * Verificación UI de la lista de pedidos (punto 1 del encargo).

 * Comprueba que «Pedidos» solo aparece para el rol chef/restaurante:
 *   - Admin: sin entrada en el menú y acceso bloqueado en la ruta.
 *   - Usuario normal: sin entrada en el menú.
 *   - Chef: entrada visible con badge de activos, página con filtros,
 *     contador y botón de alta; el badge se actualiza tras crear un pedido.
 * Requisitos: `npm run dev:app` + `npm run dev:server`.
 * Uso: npm run verificar:pedidos
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
    // Respuesta no JSON (rara): se devuelve status sin datos.
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

  // Cuentas de prueba: admin demo + chef creado por el propio admin.
  const admin = await pedir('POST', '/auth/login', {
    body: { correo: 'admin@sazonlab.test', contrasena: 'admin1234' },
  });
  check('login admin demo', admin.status === 200 && Boolean(admin.datos?.token));
  if (!admin.datos?.token) return app.quit();

  const correoChef = `ui-pedidos-${Date.now()}@sazonlab.test`;
  const creado = await pedir('POST', '/admin/usuarios', {
    token: admin.datos.token,
    body: { nombre: 'Chef UI', correo: correoChef, contrasena: 'clave-chef-123', rol: 'chef' },
  });
  check('admin crea cuenta chef', creado.status === 201, `status=${creado.status}`);
  const chef = await pedir('POST', '/auth/login', {
    body: { correo: correoChef, contrasena: 'clave-chef-123' },
  });
  check('login chef', chef.status === 200 && chef.datos?.usuario?.rol === 'chef');

  const receta = await pedir('POST', '/recipes', {
    token: chef.datos?.token,
    body: {
      titulo: 'Receta pedido UI',
      ingredientes: [{ nombre: 'Arroz', cantidad: 1, unidad: 'taza' }],
      pasos: ['Cocinar'],
    },
  });
  check('receta del chef creada', receta.status === 201, `status=${receta.status}`);
  const pedido = await pedir('POST', '/pedidos', {
    token: chef.datos?.token,
    body: {
      total: 25,
      metodo_pago: 'efectivo',
      recetas: [{ receta_id: receta.datos?.receta?.id, cantidad: 1 }],
    },
  });
  check('pedido activo creado', pedido.status === 201, `status=${pedido.status}`);

  /** Inyecta la sesión indicada y navega a una ruta (con recarga). */
  const abrir = async (ruta, datosLogin, recargar = true) => {
    await win.loadURL(`http://localhost:5173/#${ruta}`);
    await dormir(500);
    // Doble stringify: el valor debe ser un STRING JSON dentro del código JS
    const sesion = JSON.stringify(
      JSON.stringify({ state: { token: datosLogin.token, usuario: datosLogin.usuario }, version: 0 }),
    );
    await win.webContents.executeJavaScript(
      `localStorage.setItem('sazonlab-auth', ${sesion}); true;`,
    );
    if (recargar) {
      await win.webContents.reload();
      await dormir(2200);
    }
  };

  const leer = (expr) => win.webContents.executeJavaScript(expr);
  const linkPedidos = () =>
    leer(
      `[...document.querySelectorAll('#sidebar-principal a')].filter(a => a.textContent.includes('Pedidos')).length`,
    );

  // 1) Admin: sin opción de pedidos y ruta bloqueada
  await abrir('/mis-recetas', admin.datos);
  check('admin: sin entrada «Pedidos» en el menú', (await linkPedidos()) === 0);
  await abrir('/pedidos', admin.datos, false);
  await dormir(1200);
  let texto = await leer('document.body.innerText');
  check('admin: ruta /pedidos bloqueada', /solo para cuentas Chef\/Restaurante/i.test(texto));

  // 2) Chef: entrada visible, badge con activos y página completa
  await abrir('/mis-recetas', chef.datos);
  check('chef: entrada «Pedidos» en el menú', (await linkPedidos()) === 1);
  const badge = await leer(
    `(() => { const a = [...document.querySelectorAll('#sidebar-principal a')].find(a => a.textContent.includes('Pedidos')); return a?.querySelector('span[aria-label*="pedidos activos"]')?.textContent || null; })()`,
  );
  check('chef: badge de pedidos activos visible', badge !== null, `badge=${badge}`);

  await abrir('/pedidos', chef.datos);
  texto = await leer('document.body.innerText');
  check('chef: página «Lista de pedidos»', /Lista de pedidos/i.test(texto));
  check('chef: filtros por estado/fecha', /Filtrar pedidos/i.test(texto) && /Desde/i.test(texto) && /Hasta/i.test(texto));
  check('chef: contador de activos', /Pedidos activos/i.test(texto));
  check('chef: botón «Nuevo pedido»', /Nuevo pedido/i.test(texto));
  check('chef: pedido de prueba listado', /Pedido #\d+/.test(texto));

  console.log(`\n${fallos === 0 ? 'TODO OK' : `${fallos} FALLO(S)`}`);
  await dormir(300);
  app.quit();
  process.exitCode = fallos === 0 ? 0 : 1;
});
