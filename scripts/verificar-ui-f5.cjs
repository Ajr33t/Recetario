/**
 * Verificación UI de los ajustes de la Fase 5 (cliente):
 *  1. «Mis recetas» NO muestra las opciones de JSON (se movieron a Ajustes).
 *  2. Ajustes → Datos sí ofrece Exportar/Importar JSON (RF-21).
 *  3. El libro de cocina: portada, botón PDF, ÍNDICE con nombre y número
 *     de página, y PÁGINA FIJA de medidas y equivalencias.
 *  4. El diálogo de compartir ofrece imagen (PNG) y PDF.
 *  5. Checklist de ingredientes en el detalle (marca + persistencia).
 *  6. Explorar: solo áreas con recetas y la búsqueda devuelve resultados.
 *  7. Página /medidas: conversor funcional y tablas es/en.
 * Requisitos: `npm run dev:app` + `npm run dev:server` y red (registro).
 * Uso: npm run verificar:ui-f5
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

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  // 1) Cuenta de prueba + receta propia para el libro/compartir/checklist
  const correo = `ui-f5-${Date.now()}@sazonlab.test`;
  const reg = await fetch(`${API}/auth/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'UI Fase 5', correo, contrasena: 'clave-ui-123456' }),
  }).then((r) => r.json());
  check('registro de cuenta de prueba', Boolean(reg.token));

  const auth = JSON.stringify({
    state: { token: reg.token, usuario: reg.usuario },
    version: 0,
  });

  const creada = await fetch(`${API}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${reg.token}` },
    body: JSON.stringify({
      titulo: 'Tarta de chocolate de prueba',
      descripcion: 'Probando el libro de cocina',
      tiempo_min: 50,
      dificultad: 'media',
      porciones: 8,
      ingredientes: [
        { nombre: 'chocolate', cantidad: 200, unidad: 'g' },
        { nombre: 'huevos', cantidad: 4, unidad: null },
        { nombre: 'azúcar', cantidad: 150, unidad: 'g' },
      ],
      pasos: [{ descripcion: 'Derretir el chocolate' }, { descripcion: 'Hornear 40 minutos' }],
    }),
  }).then((r) => r.json());
  const idReceta = creada?.receta?.id;
  check('receta de prueba creada', Boolean(idReceta), `id=${idReceta}`);

  /** Navega a una ruta inyectando la sesión y RECARGANDO (garantiza rehidratación). */
  const abrir = async (ruta) => {
    await win.loadURL(`http://localhost:5173/#${ruta}`);
    await dormir(700);
    await win.webContents.executeJavaScript(
      `localStorage.setItem('sazonlab-auth', ${JSON.stringify(auth)}); true;`,
    );
    await win.webContents.reload();
    await dormir(2400);
  };

  const leer = (expr) => win.webContents.executeJavaScript(expr);

  // ── 2) Mis recetas: sin JSON, con libro ──
  await abrir('/mis-recetas');
  let texto = await leer('document.body.innerText');
  check('Mis recetas: sin «Exportar JSON»', !/Exportar JSON/i.test(texto));
  check('Mis recetas: sin «Importar JSON»', !/Importar JSON/i.test(texto));
  check('Mis recetas: sí ofrece generar el libro (PDF)', /Generar libro de cocina/i.test(texto));

  // ── 3) Ajustes → Datos: JSON presente ──
  await abrir('/ajustes');
  texto = await leer('document.body.innerText');
  check('Ajustes: sección Datos con Exportar JSON', /Exportar JSON/i.test(texto));
  check('Ajustes: sección Datos con Importar JSON', /Importar JSON/i.test(texto));

  // ── 4) Libro de cocina: portada + PDF + índice + medidas ──
  await abrir('/mis-recetas');
  const hayBotonLibro = await leer(
    `[...document.querySelectorAll('button')].some(b => /Generar libro de cocina/i.test(b.textContent))`,
  );
  check('botón «Generar libro de cocina» visible', hayBotonLibro === true);
  if (hayBotonLibro) {
    await leer(
      `[...document.querySelectorAll('button')].find(b => /Generar libro de cocina/i.test(b.textContent)).click(); true`,
    );
    await dormir(2800);
    const tienePortada = await leer('Boolean(document.querySelector(".libro-portada"))');
    const tieneBotonPdf = await leer(
      `[...document.querySelectorAll('button')].some(b => /Descargar libro en PDF/i.test(b.textContent))`,
    );
    const textoLibro = await leer('document.body.innerText');
    check('libro: portada presente', tienePortada === true);
    check('libro: botón «Descargar libro en PDF»', tieneBotonPdf === true);
    check('libro: documento lista las recetas', /Tarta de chocolate de prueba/.test(textoLibro));
    const numPaginas = await leer('document.querySelectorAll(".libro-pagina").length');
    check('libro: secciones por página', numPaginas >= 3, `paginas=${numPaginas}`);
    const estilosPortada = await leer(`(() => {
      const p = document.querySelector('.libro-portada');
      if (!p) return '';
      const s = getComputedStyle(p);
      return s.backgroundImage + '|' + s.borderTopWidth;
    })()`);
    check(
      'libro: portada con estilo decorativo (gradiente/borde)',
      /gradient/.test(estilosPortada) && !/^0px/.test(estilosPortada.split('|')[1] || ''),
      estilosPortada.slice(0, 80),
    );

    // Índice con nombre y número de página (tras medir e imágenes)
    await dormir(3000);
    const indice = await leer(`(() => {
      const filas = [...document.querySelectorAll('.libro-indice-fila')];
      return JSON.stringify({
        n: filas.length,
        nombre: filas[0]?.querySelector('.libro-indice-nombre')?.textContent || '',
        pag: filas[0]?.querySelector('.libro-indice-pag')?.textContent || '',
        conPuntos: Boolean(filas[0]?.querySelector('.libro-indice-puntos')),
      });
    })()`);
    const idx = JSON.parse(indice);
    check('libro: índice con una fila por receta', idx.n >= 1, `filas=${idx.n}`);
    check('libro: índice lista el nombre', /Tarta de chocolate/.test(idx.nombre), idx.nombre);
    check(
      'libro: índice con número de página (≥ 4)',
      /^\d+$/.test(idx.pag) && Number(idx.pag) >= 4,
      `pag=${idx.pag}`,
    );
    check('libro: índice con puntos guía', idx.conPuntos === true);

    // Página fija de medidas y equivalencias
    const medidasLibro = await leer(`(() => {
      const s = document.querySelector('section[aria-label="Medidas y equivalencias"]');
      return JSON.stringify({
        presente: Boolean(s),
        tablas: s ? s.querySelectorAll('.libro-tabla').length : 0,
        filas: s ? s.querySelectorAll('.libro-tabla tbody tr').length : 0,
        volumen: s ? /Volumen/.test(s.textContent) : false,
        temperatura: s ? /Temperatura/.test(s.textContent) : false,
        esEn: s ? /English/.test(s.textContent) : false,
      });
    })()`);
    const ml = JSON.parse(medidasLibro);
    check('libro: página fija de medidas presente', ml.presente === true);
    check(
      'libro: medidas con 3 tablas (volumen/peso/temperatura)',
      ml.tablas === 3 && ml.filas >= 15,
      `tablas=${ml.tablas} filas=${ml.filas}`,
    );
    check('libro: medidas en español e inglés', ml.esEn && ml.volumen && ml.temperatura);
  }

  // ── 5) Compartir: imagen + PDF ──
  await abrir(`/receta/${idReceta}`);
  const hayCompartir = await leer(
    `[...document.querySelectorAll('button')].some(b => /Compartir/i.test(b.textContent))`,
  );
  check('detalle: botón Compartir visible', hayCompartir === true);
  if (hayCompartir) {
    await leer(
      `[...document.querySelectorAll('button')].find(b => /Compartir/i.test(b.textContent)).click(); true`,
    );
    await dormir(900);
    const opciones = await leer(
      `[...document.querySelectorAll('.swal2-popup button')].map(b => b.textContent.trim()).join(' | ')`,
    );
    check('compartir: opción de imagen PNG', /imagen \(PNG\)/i.test(opciones), opciones);
    check('compartir: opción de PDF', /PDF/i.test(opciones));
    check('compartir: opción de copiar enlace', /enlace/i.test(opciones));
    await leer(`document.querySelector('.swal2-cancel')?.click(); true`).catch(() => {});
    await dormir(600);
  }

  // ── 6) Checklist de ingredientes (marca + persistencia) ──
  const nChecks = await leer(`document.querySelectorAll('main input[type=checkbox]').length`);
  check('detalle: ingredientes con casillas (checklist)', nChecks >= 3, `n=${nChecks}`);
  await leer(`(() => {
    const cb = document.querySelector('main input[type=checkbox]');
    if (cb) cb.click();
    return true;
  })()`);
  await dormir(700);
  const marcado = await leer(
    `document.querySelector('main input[type=checkbox]')?.checked === true`,
  );
  check('detalle: la casilla se marca', marcado === true);
  texto = await leer('document.body.innerText');
  check('detalle: muestra «1/3 listos»', /1\/3 listos/.test(texto));
  await win.webContents.reload();
  await dormir(2600);
  const persiste = await leer(
    `document.querySelector('main input[type=checkbox]')?.checked === true`,
  );
  check('detalle: el marcado persiste tras recargar', persiste === true);
  const hayVaciar = await leer(
    `[...document.querySelectorAll('main button')].some(b => /Vaciar checklist/.test(b.textContent))`,
  );
  check('detalle: botón «Vaciar checklist»', hayVaciar === true);
  await leer(
    `[...document.querySelectorAll('main button')].find(b => /Vaciar checklist/.test(b.textContent))?.click(); true`,
  );
  await dormir(600);
  const trasVaciar = await leer(
    `document.querySelector('main input[type=checkbox]')?.checked ?? false`,
  );
  check('detalle: «Vaciar» desmarca todo', trasVaciar === false);

  // ── 7) Explorar: solo áreas con recetas y búsqueda funcional ──
  await abrir('/buscar');
  await leer(
    `[...document.querySelectorAll('[role=tab]')].find(b => /Explorar/.test(b.textContent)).click(); true`,
  );
  await dormir(3500); // /search/filtros
  const explorar = await leer(`(() => {
    const s = [...document.querySelectorAll('select')].find(x => x.getAttribute('aria-label') === 'Área o región');
    const c = [...document.querySelectorAll('select')].find(x => x.getAttribute('aria-label') === 'Categoría');
    const vals = s ? [...s.options].map(o => o.value).filter(Boolean) : [];
    const cats = c ? [...c.options].map(o => o.value).filter(Boolean) : [];
    return JSON.stringify({ areas: vals, unicos: new Set(vals).size, categorias: cats.length });
  })()`);
  const exp = JSON.parse(explorar);
  check(
    'explorar: áreas filtradas (≤ 40, sin duplicados)',
    exp.areas.length > 0 && exp.areas.length <= 40 && exp.unicos === exp.areas.length,
    `n=${exp.areas.length} unicos=${exp.unicos}`,
  );
  check('explorar: categorías completas', exp.categorias >= 10, `n=${exp.categorias}`);
  await leer(`(() => {
    const s = [...document.querySelectorAll('select')].find(x => x.getAttribute('aria-label') === 'Área o región');
    const opt = [...s.options].find(o => o.value);
    s.value = opt.value; s.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await dormir(300);
  await leer(
    `[...document.querySelectorAll('button')].find(b => /Buscar recetas/.test(b.textContent)).click(); true`,
  );
  let resultadosExplorar = 0;
  for (let i = 0; i < 25 && resultadosExplorar === 0; i++) {
    await dormir(1000);
    resultadosExplorar = await leer(`(() => {
      const h2 = [...document.querySelectorAll('h2')].find(h => /Resultados/.test(h.textContent))?.textContent || '';
      const m = h2.match(/\\((\\d+)\\)/);
      return m ? Number(m[1]) : 0;
    })()`);
  }
  check(
    'explorar: el área elegida devuelve recetas',
    resultadosExplorar > 0,
    `n=${resultadosExplorar}`,
  );

  // ── 8) Página /medidas: conversor + tablas ──
  await abrir('/medidas');
  const medidasPag = await leer(`(() => {
    const tablas = document.querySelectorAll('main table').length;
    const filas = document.querySelectorAll('main table tbody tr').length;
    const inputs = document.querySelectorAll('main input[type=number]').length;
    const selects = document.querySelectorAll('main select').length;
    return JSON.stringify({ tablas, filas, inputs, selects });
  })()`);
  const mp = JSON.parse(medidasPag);
  check(
    'medidas: tres tablas de equivalencias es/en',
    mp.tablas === 3 && mp.filas >= 20,
    `tablas=${mp.tablas} filas=${mp.filas}`,
  );
  check('medidas: conversor con cantidad y dos unidades', mp.inputs >= 1 && mp.selects === 2);
  await leer(`(() => {
    const input = document.querySelector('main input[type=number]');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(input, '2');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  await dormir(700);
  const convertido = await leer(`document.querySelector('main [role=status]')?.textContent || ''`);
  check(
    'medidas: 2 tazas = 473,176 mililitros',
    /473[.,]176/.test(convertido),
    convertido.trim().slice(0, 70),
  );

  console.log(`\n${fallos === 0 ? 'TODOS LOS CHECKS PASARON' : `${fallos} CHECK(S) FALLARON`}`);
  app.exit(fallos > 0 ? 1 : 0);
});

process.on('unhandledRejection', (err) => {
  console.error('ERROR FATAL:', err.message);
  app.exit(1);
});
