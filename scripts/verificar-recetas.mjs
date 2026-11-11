/**
 * Verificación integral de recetas propias y favoritos (Fase 5).
 * Contra http://localhost:3001 (requisito: `npm run dev:server` y
 * conexión a internet para la importación externa).
 *
 * Cubre: CRUD, detalle público/privado (RF-12), versiones restaurables
 * (RF-07), papelera (RF-08), exportar/importar JSON (RF-21) y favoritos
 * propios + externos (RF-09).
 * Uso: npm run verificar:recetas
 */
const BASE = process.env.API_URL || 'http://localhost:3001/api';

let fallos = 0;

const check = (nombre, cond, detalle = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? 'OK  ' : 'FALLO'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

async function llamar(metodo, ruta, { token, body } = {}) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const datos = await respuesta.json().catch(() => null);
  return { status: respuesta.status, datos };
}

async function main() {
  // 0) Salud
  const health = await llamar('GET', '/health');
  check('GET /health', health.status === 200, `status=${health.status}`);
  if (health.status !== 200) throw new Error('API no responde: inicia npm run dev:server');

  // 1) Sesión
  const correo = `test-f5-${Date.now()}@sazonlab.test`;
  const reg = await llamar('POST', '/auth/registro', {
    body: { nombre: 'Tester Fase 5', correo, contrasena: 'clave-f5-123456' },
  });
  check(
    'registro → token',
    reg.status === 201 && Boolean(reg.datos?.token),
    `status=${reg.status}`,
  );
  const token = reg.datos?.token;

  // 2) Crear receta propia (RF-06)
  const creada = await llamar('POST', '/recipes', {
    token,
    body: {
      titulo: 'Arroz con pollo de la abuela',
      descripcion: 'Receta familiar de domingo',
      tiempo_min: 45,
      dificultad: 'media',
      porciones: 4,
      etiquetas: ['casero', 'domingo'],
      ingredientes: [
        { nombre: 'pollo', cantidad: 1, unidad: 'kg' },
        { nombre: 'arroz', cantidad: 2, unidad: 'tazas' },
        { nombre: 'cebolla', cantidad: 1, unidad: null },
      ],
      pasos: [
        { descripcion: 'Dorar el pollo en la olla' },
        { descripcion: 'Añadir cebolla y arroz' },
        { descripcion: 'Cocinar 25 minutos a fuego bajo' },
      ],
    },
  });
  check(
    'POST /recipes crea con ingredientes y pasos',
    creada.status === 201,
    `status=${creada.status}`,
  );
  const id = creada.datos?.receta?.id;
  check(
    'detalle anidado correcto',
    creada.datos?.receta?.ingredientes?.length === 3 && creada.datos?.receta?.pasos?.length === 3,
    `ing=${creada.datos?.receta?.ingredientes?.length} pasos=${creada.datos?.receta?.pasos?.length}`,
  );
  check('receta nace privada', creada.datos?.receta?.visibilidad === 'privada');

  // 3) Detalle sin sesión (RF-12: compartible solo si es pública)
  const privadaSinToken = await llamar('GET', `/recipes/${id}`);
  check(
    'detalle privada sin sesión → 404',
    privadaSinToken.status === 404,
    `status=${privadaSinToken.status}`,
  );
  const conToken = await llamar('GET', `/recipes/${id}`, { token });
  check('detalle con sesión → 200', conToken.status === 200);

  // 4) Editar + historial de versiones (RF-07)
  const editada = await llamar('PUT', `/recipes/${id}`, {
    token,
    body: { titulo: 'Arroz con pollo (editada)', tiempo_min: 50 },
  });
  check(
    'PUT /recipes/:id edita',
    editada.status === 200 && editada.datos?.receta?.titulo === 'Arroz con pollo (editada)',
  );
  const versiones = await llamar('GET', `/recipes/${id}/versiones`, { token });
  check(
    'historial de versiones ≥ 1',
    (versiones.datos?.versiones?.length || 0) >= 1,
    `n=${versiones.datos?.versiones?.length}`,
  );

  const restaurada = await llamar('POST', `/recipes/${id}/versiones/1/restaurar`, { token });
  check(
    'restaurar versión 1 recupera el título original',
    restaurada.status === 200 &&
      restaurada.datos?.receta?.titulo === 'Arroz con pollo de la abuela',
    `status=${restaurada.status} titulo=${restaurada.datos?.receta?.titulo}`,
  );
  check(
    'la restauración conserva ingredientes',
    (restaurada.datos?.receta?.ingredientes?.length || 0) === 3,
    `ing=${restaurada.datos?.receta?.ingredientes?.length}`,
  );

  // 5) Compartir por enlace (RF-12): hacer pública y leer sin sesión
  await llamar('PUT', `/recipes/${id}`, { token, body: { visibilidad: 'publica' } });
  const publicaSinToken = await llamar('GET', `/recipes/${id}`);
  check(
    'detalle pública sin sesión → 200 (enlace compartible)',
    publicaSinToken.status === 200,
    `status=${publicaSinToken.status}`,
  );

  // 6) Favoritos propios (RF-09)
  const fav1 = await llamar('POST', `/favorites/${id}`, { token });
  check('agregar favorita propia', fav1.status === 200 && fav1.datos?.favorito === true);
  const lista1 = await llamar('GET', '/favorites', { token });
  check(
    'GET /favorites lista 1',
    (lista1.datos?.favoritos?.length || 0) === 1,
    `n=${lista1.datos?.favoritos?.length}`,
  );
  const fav2 = await llamar('POST', `/favorites/${id}`, { token });
  check('alternar quita la favorita', fav2.status === 200 && fav2.datos?.favorito === false);
  const fav3 = await llamar('POST', `/favorites/${id}`, { token });
  check('alternar vuelve a agregarla', fav3.status === 200 && fav3.datos?.favorito === true);

  // 7) Favorita de receta externa (importa a la colección)
  const busq = await llamar('GET', '/search?q=chicken');
  const externoId = busq.datos?.recetas?.[0]?.id;
  check('hay receta externa para probar', Boolean(externoId), `id=${externoId}`);
  const guardarExt = await llamar('POST', '/favorites/externa', {
    token,
    body: { externo_id: externoId },
  });
  check(
    'guardar receta externa → 201 con receta_id',
    guardarExt.status === 201 && Boolean(guardarExt.datos?.receta_id),
    `status=${guardarExt.status}`,
  );
  const externaId = guardarExt.datos?.receta_id;
  const estado = await llamar('GET', `/favorites/estado?externo_id=${externoId}`, { token });
  check(
    'estado externo: guardada y favorita',
    estado.datos?.receta_id === externaId && estado.datos?.favorito === true,
  );
  const guardarExt2 = await llamar('POST', '/favorites/externa', {
    token,
    body: { externo_id: externoId },
  });
  check(
    'guardar dos veces no duplica',
    guardarExt2.datos?.receta_id === externaId,
    `id=${guardarExt2.datos?.receta_id}`,
  );
  const detalleExterna = await llamar('GET', `/recipes/${externaId}`, { token });
  check(
    'externa importada con ingredientes y pasos',
    (detalleExterna.datos?.receta?.ingredientes?.length || 0) > 0 &&
      (detalleExterna.datos?.receta?.pasos?.length || 0) > 0,
    `origen=${detalleExterna.datos?.receta?.origen}`,
  );
  const lista2 = await llamar('GET', '/favorites', { token });
  check(
    'GET /favorites lista 2 (propia + externa)',
    (lista2.datos?.favoritos?.length || 0) === 2,
    `n=${lista2.datos?.favoritos?.length}`,
  );

  // 8) Exportar / importar JSON (RF-21)
  const exportar = await llamar('GET', '/recipes/exportar', { token });
  check(
    'exportar → formato sazonlab.recetas',
    exportar.status === 200 && exportar.datos?.formato === 'sazonlab.recetas',
    `total=${exportar.datos?.total}`,
  );
  check(
    'export incluye ingredientes y pasos',
    (exportar.datos?.recetas || []).every(
      (r) => Array.isArray(r.ingredientes) && Array.isArray(r.pasos),
    ),
  );
  const paraImportar = {
    recetas: [
      exportar.datos.recetas[0],
      { titulo: 'x' },
      {
        titulo: 'Receta importada válida',
        ingredientes: [{ nombre: 'azúcar' }],
        pasos: [{ descripcion: 'Mezclar todo' }],
      },
    ],
  };
  const importar = await llamar('POST', '/recipes/importar', { token, body: paraImportar });
  check(
    'importar JSON: 2 válidas, 1 error',
    importar.status === 201 &&
      importar.datos?.importadas === 2 &&
      importar.datos?.errores?.length === 1,
    `status=${importar.status} ok=${importar.datos?.importadas} errores=${importar.datos?.errores?.length}`,
  );
  const importarVacio = await llamar('POST', '/recipes/importar', { token, body: { recetas: [] } });
  check('importar vacío → 400', importarVacio.status === 400, `status=${importarVacio.status}`);

  // 9) Papelera (RF-08 / CU-10)
  const borrada = await llamar('DELETE', `/recipes/${id}`, { token });
  check('DELETE → papelera', borrada.status === 200 && borrada.datos?.ok === true);
  const activas = await llamar('GET', '/recipes', { token });
  check('ya no aparece en activas', !(activas.datos?.recetas || []).some((r) => r.id === id));
  const papelera = await llamar('GET', '/recipes?estado=papelera', { token });
  check(
    'aparece en la papelera',
    (papelera.datos?.recetas || []).some((r) => r.id === id),
    `n=${papelera.datos?.recetas?.length}`,
  );
  const restaurar = await llamar('POST', `/recipes/${id}/restaurar`, { token });
  check('restaurar de la papelera', restaurar.status === 200);
  const activas2 = await llamar('GET', '/recipes', { token });
  check(
    'vuelve a estar activa',
    (activas2.datos?.recetas || []).some((r) => r.id === id),
  );

  // 10) Borrado permanente (desde la papelera)
  const importadas = (await llamar('GET', '/recipes', { token })).datos.recetas.filter(
    (r) => r.titulo === 'Receta importada válida',
  );
  const idImportada = importadas[0]?.id;
  await llamar('DELETE', `/recipes/${idImportada}`, { token });
  const permanente = await llamar('DELETE', `/recipes/${idImportada}?permanente=1`, { token });
  check(
    'borrado permanente desde papelera',
    permanente.status === 200 && permanente.datos?.permanente === true,
    `status=${permanente.status}`,
  );
  const yaNo = await llamar('GET', `/recipes/${idImportada}`, { token });
  check('la receta eliminada ya no existe', yaNo.status === 404, `status=${yaNo.status}`);

  // 11) Casos de error
  const noExiste = await llamar('GET', '/recipes/999999999');
  check('receta inexistente → 404', noExiste.status === 404, `status=${noExiste.status}`);
  const sinSesion = await llamar('POST', '/recipes', { body: { titulo: 'Intento anónimo' } });
  check('crear sin sesión → 401', sinSesion.status === 401, `status=${sinSesion.status}`);
  const tituloCorto = await llamar('POST', '/recipes', { token, body: { titulo: 'ab' } });
  check('título < 3 → 400', tituloCorto.status === 400, `status=${tituloCorto.status}`);
  const restaurarInexistente = await llamar('POST', '/recipes/999999999/restaurar', { token });
  check(
    'restaurar inexistente → 404',
    restaurarInexistente.status === 404,
    `status=${restaurarInexistente.status}`,
  );
  const externoInvalido = await llamar('POST', '/favorites/externa', {
    token,
    body: { externo_id: 'abc' },
  });
  check(
    'externo_id no numérico → 400',
    externoInvalido.status === 400,
    `status=${externoInvalido.status}`,
  );

  // Resumen
  console.log(`\n${fallos === 0 ? 'TODOS LOS CHECKS PASARON' : `${fallos} CHECK(S) FALLARON`}`);
  if (fallos > 0) process.exit(1);
}

main().catch((err) => {
  console.error('ERROR FATAL:', err.message);
  process.exit(1);
});
