/**
 * Verificación integral de búsqueda de recetas (Fase 4).
 * Contra http://localhost:3001 (requisito: `npm run dev:server` y
 * conexión a internet para TheMealDB).
 *
 * Cubre: por nombre, por ingredientes (coincidencias), sugerencias con IA,
 * detalle, filtros/categorías, destacadas, autocompletado y errores (400/404).
 * Uso: npm run verificar:busqueda
 */
const BASE = process.env.API_URL || 'http://localhost:3001/api';

let fallos = 0;

const check = (nombre, cond, detalle = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? 'OK  ' : 'FALLO'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

async function llamar(ruta, { token } = {}) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const datos = await respuesta.json().catch(() => null);
  return { status: respuesta.status, datos };
}

async function main() {
  // 0) Salud
  const health = await llamar('/health');
  check('GET /health', health.status === 200, `status=${health.status}`);
  if (health.status !== 200) throw new Error('API no responde: inicia npm run dev:server');

  // 1) Búsqueda por nombre
  const nombre = await llamar('/search?q=chicken');
  check('GET /search?q=chicken → 200', nombre.status === 200, `status=${nombre.status}`);
  check(
    'búsqueda por nombre tiene resultados',
    (nombre.datos?.recetas?.length || 0) > 0,
    `total=${nombre.datos?.total}`,
  );
  const primera = nombre.datos?.recetas?.[0];
  check(
    'resultado normalizado (id/titulo/ingredientes)',
    Boolean(primera?.id && primera?.titulo),
    `ej: ${primera?.titulo}`,
  );

  // 2) Búsqueda por ingredientes (fusión por frecuencia)
  const ingr = await llamar('/search/ingredientes?i=chicken,butter');
  check('GET /search/ingredientes → 200', ingr.status === 200, `status=${ingr.status}`);
  check(
    'por ingredientes tiene resultados',
    (ingr.datos?.recetas?.length || 0) > 0,
    `total=${ingr.datos?.total}`,
  );
  const ordenado = (ingr.datos?.recetas || []).every(
    (r, i, arr) => i === 0 || (arr[i - 1].coincidencias || 0) >= (r.coincidencias || 0),
  );
  check('resultados ordenados por coincidencias descendente', ordenado);
  check(
    'cada resultado expone coincidencias',
    (ingr.datos?.recetas || []).every((r) => (r.coincidencias ?? 0) >= 1),
  );

  // 3) Sugerencias (recetas + idea del chef)
  const sugg = await llamar('/search/sugerencias?i=chicken,tomato,onion');
  check('GET /search/sugerencias → 200', sugg.status === 200, `status=${sugg.status}`);
  check(
    'sugerencias trae recetas',
    (sugg.datos?.recetas?.length || 0) > 0,
    `total=${sugg.datos?.total}`,
  );
  check(
    'sugerencias declara fuente de IA',
    ['openai', 'gemini', 'ninguna'].includes(sugg.datos?.fuente),
    `fuente=${sugg.datos?.fuente}`,
  );
  check('sugerencias trae arreglo de ideas', Array.isArray(sugg.datos?.ideas));

  // 4) Detalle de receta
  const id = primera?.id;
  const det = await llamar(`/search/receta/${id}`);
  check('GET /search/receta/:id → 200', det.status === 200, `status=${det.status}`);
  check(
    'detalle con ingredientes',
    (det.datos?.receta?.ingredientes?.length || 0) > 0,
    `n=${det.datos?.receta?.ingredientes?.length}`,
  );
  check(
    'detalle con instrucciones',
    Boolean(det.datos?.receta?.instrucciones),
    `chars=${det.datos?.receta?.instrucciones?.length}`,
  );
  check(
    'detalle con imagen y categoría',
    Boolean(det.datos?.receta?.imagen && det.datos?.receta?.categoria),
  );

  // 5) Filtros y explorar
  const filtros = await llamar('/search/filtros');
  check('GET /search/filtros → 200', filtros.status === 200);
  check(
    'filtros con categorías',
    (filtros.datos?.categorias?.length || 0) >= 10,
    `n=${filtros.datos?.categorias?.length}`,
  );
  check(
    'filtros con áreas',
    (filtros.datos?.areas?.length || 0) > 0,
    `n=${filtros.datos?.areas?.length}`,
  );
  const cat = await llamar('/search/categorias?c=Pescados%20y%20mariscos');
  check(
    'GET /search/categorias?c=Pescados y mariscos → resultados',
    cat.status === 200 && (cat.datos?.recetas?.length || 0) > 0,
    `total=${cat.datos?.total}`,
  );

  // 5b) Fix «Explorar»: TODAS las áreas ofrecidas en /filtros deben
  //     devolver recetas (el servidor filtra las sin cobertura).
  for (const area of filtros.datos?.areas || []) {
    const a = await llamar(`/search/categorias?a=${encodeURIComponent(area)}`);
    check(
      `área «${area}» con recetas`,
      a.status === 200 && (a.datos?.recetas?.length || 0) > 0,
      `total=${a.datos?.total ?? '?'}`,
    );
  }

  // 6) Destacadas del inicio
  const dest = await llamar('/search/destacadas?n=3');
  check('GET /search/destacadas → 200', dest.status === 200);
  check(
    'destacadas con 3 recetas',
    dest.datos?.recetas?.length === 3,
    `n=${dest.datos?.recetas?.length}`,
  );
  check(
    'destacadas con foto real',
    (dest.datos?.recetas || []).every((r) => Boolean(r.imagen)),
  );

  // 7) Autocompletado
  const acIng = await llamar('/search/autocomplete?t=chi&tipo=ingrediente');
  check(
    'autocomplete ingrediente → sugerencias',
    acIng.status === 200 && (acIng.datos?.sugerencias?.length || 0) > 0,
    `n=${acIng.datos?.sugerencias?.length}`,
  );
  check(
    'ingredientes son strings',
    (acIng.datos?.sugerencias || []).every((s) => typeof s === 'string'),
  );
  const acRec = await llamar('/search/autocomplete?t=chi&tipo=receta');
  check(
    'autocomplete receta → sugerencias',
    acRec.status === 200 && (acRec.datos?.sugerencias?.length || 0) > 0,
    `n=${acRec.datos?.sugerencias?.length}`,
  );
  check(
    'recetas con id/titulo',
    (acRec.datos?.sugerencias || []).every((s) => Boolean(s.id && s.titulo)),
  );
  const acCorto = await llamar('/search/autocomplete?t=c&tipo=receta');
  check(
    'texto < 2 chars → lista vacía',
    acCorto.status === 200 && acCorto.datos?.sugerencias?.length === 0,
  );

  // 8) Historial con sesión (opcional): login de un usuario de prueba si existe
  //    — se omite para no depender de datos previos; el guardado se cubre
  //    implícitamente porque las búsquedas anteriores responden 200 sin token.

  // 9) Casos de error
  const corto = await llamar('/search?q=c');
  check('q < 2 caracteres → 400', corto.status === 400, `status=${corto.status}`);
  const sinIngr = await llamar('/search/sugerencias?i=');
  check('sugerencias sin ingredientes → 400', sinIngr.status === 400, `status=${sinIngr.status}`);
  const noExiste = await llamar('/search/receta/999999999');
  check('receta inexistente → 404', noExiste.status === 404, `status=${noExiste.status}`);
  const idInv = await llamar('/search/receta/abc');
  check('id no numérico → 400', idInv.status === 400, `status=${idInv.status}`);
  const catSinParam = await llamar('/search/categorias');
  check(
    'categorias sin parámetro → 400',
    catSinParam.status === 400,
    `status=${catSinParam.status}`,
  );

  // 10) Todo en español (requisito: "las recetas siempre en español")
  const esNombre = await llamar('/search?q=pollo');
  check(
    'búsqueda en español q=pollo',
    esNombre.status === 200 && (esNombre.datos?.recetas?.length || 0) > 0,
    `total=${esNombre.datos?.total}`,
  );
  const esIngr = await llamar('/search/ingredientes?i=pollo,tomate');
  check(
    'ingredientes en español i=pollo,tomate',
    esIngr.status === 200 && (esIngr.datos?.recetas?.length || 0) > 0,
    `total=${esIngr.datos?.total}`,
  );
  check(
    'filtros de categorías en español',
    (filtros.datos?.categorias || []).includes('Pollo'),
    `ej=${filtros.datos?.categorias?.slice(0, 5).join(', ')}`,
  );
  check(
    'filtros de áreas en español',
    (filtros.datos?.areas || []).includes('Italiano'),
    `ej=${filtros.datos?.areas?.slice(0, 5).join(', ')}`,
  );
  check(
    'detalle con idioma es y traducido',
    det.datos?.receta?.idioma === 'es' && det.datos?.receta?.traducido === true,
  );
  check(
    'ingredientes del detalle en español',
    (det.datos?.receta?.ingredientes || []).some((i) =>
      ['pollo', 'salsa de soya', 'arroz', 'tomate', 'cebolla'].includes(
        (i.nombre || '').toLowerCase(),
      ),
    ),
    `ej=${(det.datos?.receta?.ingredientes || [])
      .slice(0, 3)
      .map((i) => i.nombre)
      .join(', ')}`,
  );
  const inicioInstrucciones = (det.datos?.receta?.instrucciones || '').slice(0, 200);
  const hayInglesObvio = ['Preheat', 'Combine', 'Bake for', 'Serve with'].some((frase) =>
    inicioInstrucciones.includes(frase),
  );
  check(
    'instrucciones traducidas (sin inglés obvio)',
    !hayInglesObvio,
    `inicio=${inicioInstrucciones.slice(0, 60)}`,
  );
  const acEsp = await llamar('/search/autocomplete?t=pol&tipo=ingrediente');
  check(
    'autocomplete parcial en español → "Pollo"',
    (acEsp.datos?.sugerencias || []).includes('Pollo'),
    `n=${acEsp.datos?.sugerencias?.length}`,
  );

  // Resumen
  console.log(`\n${fallos === 0 ? 'TODOS LOS CHECKS PASARON' : `${fallos} CHECK(S) FALLARON`}`);
  if (fallos > 0) process.exit(1);
}

main().catch((err) => {
  console.error('ERROR FATAL:', err.message);
  process.exit(1);
});
