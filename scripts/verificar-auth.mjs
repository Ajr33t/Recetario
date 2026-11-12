/**
 * Verificación integral de autenticación y recetas (Fase 3).
 * Contra http://localhost:3001 (requisito: `npm run dev:server` corriendo).
 *
 * Flujo: registro → login → /me → perfil → cambiar contraseña →
 * recuperación por código → recetas CRUD → controles de seguridad (401/403)
 * → panel de administración RF-22 (roles, inactivación, revocación).
 * Uso: npm run verificar:auth
 */
const BASE = process.env.API_URL || 'http://localhost:3001/api';

const correo = `test-auth-${Date.now()}@sazonlab.test`;
const pass0 = 'clave-inicial-123';
const pass1 = 'clave-nueva-456';
const pass2 = 'clave-final-789';

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

  // 1) Registro
  const reg = await llamar('POST', '/auth/registro', {
    body: { nombre: 'Tester Fase 3', correo, contrasena: pass0 },
  });
  check(
    'POST /auth/registro crea cuenta',
    reg.status === 201 && Boolean(reg.datos?.token),
    `status=${reg.status}`,
  );
  check(
    'registro devuelve usuario sin hash',
    reg.datos?.usuario?.correo === correo && !('contrasena_hash' in (reg.datos?.usuario || {})),
  );

  const regDup = await llamar('POST', '/auth/registro', {
    body: { nombre: 'Dup', correo, contrasena: pass0 },
  });
  check('registro duplicado → 409', regDup.status === 409, `status=${regDup.status}`);

  const regInvalido = await llamar('POST', '/auth/registro', {
    body: { nombre: 'X', correo: 'no-es-correo', contrasena: '123' },
  });
  check('registro inválido → 400', regInvalido.status === 400, `status=${regInvalido.status}`);

  // 2) Login
  const login = await llamar('POST', '/auth/login', { body: { correo, contrasena: pass0 } });
  check(
    'POST /auth/login ok',
    login.status === 200 && Boolean(login.datos?.token),
    `status=${login.status}`,
  );
  const token = login.datos?.token;

  const loginMalo = await llamar('POST', '/auth/login', {
    body: { correo, contrasena: 'mala-clave-x' },
  });
  check(
    'login con contraseña incorrecta → 401',
    loginMalo.status === 401,
    `status=${loginMalo.status}`,
  );

  // 3) /me con y sin token
  const me = await llamar('GET', '/auth/me', { token });
  check('GET /auth/me con token', me.status === 200 && me.datos?.usuario?.correo === correo);
  const meSin = await llamar('GET', '/auth/me');
  check('GET /auth/me sin token → 401', meSin.status === 401, `status=${meSin.status}`);

  // 4) Perfil: personalización
  const perfil = await llamar('PUT', '/auth/perfil', {
    token,
    body: { nombre: 'Chef Tester', avatar: 'fa-user-ninja', bio: 'Amante de la cocina de prueba' },
  });
  check(
    'PUT /auth/perfil actualiza nombre/avatar/bio',
    perfil.status === 200 &&
      perfil.datos?.usuario?.nombre === 'Chef Tester' &&
      perfil.datos?.usuario?.avatar === 'fa-user-ninja' &&
      perfil.datos?.usuario?.bio === 'Amante de la cocina de prueba',
    `status=${perfil.status}`,
  );

  // 5) Cambio de contraseña
  const cambio = await llamar('POST', '/auth/cambiar-contrasena', {
    token,
    body: { actual: pass0, nueva: pass1 },
  });
  check('POST /auth/cambiar-contrasena ok', cambio.status === 200, `status=${cambio.status}`);
  const loginPass1 = await llamar('POST', '/auth/login', { body: { correo, contrasena: pass1 } });
  check('login con la contraseña nueva', loginPass1.status === 200, `status=${loginPass1.status}`);

  // 6) Recuperación por código (modo demo devuelve el código)
  const olvido = await llamar('POST', '/auth/olvide-contrasena', { body: { correo } });
  check(
    'POST /auth/olvide-contrasena responde ok',
    olvido.status === 200 && olvido.datos?.ok === true,
    `status=${olvido.status} demo=${olvido.datos?.demo}`,
  );
  const codigo = olvido.datos?.codigo;
  check(
    'modo demo entrega el código para probar el flujo',
    Boolean(codigo) && /^\d{6}$/.test(codigo),
    codigo ? `codigo=${codigo}` : 'sin código (¿RESEND_API_KEY configurado?)',
  );

  if (codigo) {
    const codigoMalo = await llamar('POST', '/auth/restablecer-contrasena', {
      body: { correo, codigo: '000000', contrasena: pass2 },
    });
    check('código incorrecto → 400', codigoMalo.status === 400, `status=${codigoMalo.status}`);

    const restablecer = await llamar('POST', '/auth/restablecer-contrasena', {
      body: { correo, codigo, contrasena: pass2 },
    });
    check(
      'POST /auth/restablecer-contrasena ok',
      restablecer.status === 200,
      `status=${restablecer.status}`,
    );

    const loginPass2 = await llamar('POST', '/auth/login', { body: { correo, contrasena: pass2 } });
    check(
      'login con la contraseña restablecida',
      loginPass2.status === 200,
      `status=${loginPass2.status}`,
    );
  }

  const tokenFinal = (await llamar('POST', '/auth/login', { body: { correo, contrasena: pass2 } }))
    .datos?.token;

  // 7) Recetas: CRUD protegido por usuario
  const crear = await llamar('POST', '/recipes', {
    token: tokenFinal,
    body: {
      titulo: 'Receta de prueba Fase 3',
      descripcion: 'Creada por el script de verificación',
      tiempo_min: 30,
      dificultad: 'facil',
      porciones: 2,
      etiquetas: ['prueba'],
      ingredientes: [{ nombre: 'Tomate', cantidad: 3, unidad: 'un' }],
      pasos: [{ descripcion: 'Cortar el tomate' }, { descripcion: 'Saltear 5 minutos' }],
    },
  });
  check(
    'POST /recipes crea con ingredientes y pasos',
    crear.status === 201 &&
      crear.datos?.receta?.ingredientes?.length === 1 &&
      crear.datos?.receta?.pasos?.length === 2,
    `status=${crear.status}`,
  );
  const idReceta = crear.datos?.receta?.id;

  const lista = await llamar('GET', '/recipes', { token: tokenFinal });
  check(
    'GET /recipes lista la receta del usuario',
    lista.status === 200 && lista.datos?.recetas?.some((r) => r.id === idReceta),
    `total=${lista.datos?.recetas?.length}`,
  );

  const detalle = await llamar('GET', `/recipes/${idReceta}`, { token: tokenFinal });
  check(
    'GET /recipes/:id devuelve el detalle anidado',
    detalle.status === 200 && detalle.datos?.receta?.pasos?.length === 2,
  );

  const editar = await llamar('PUT', `/recipes/${idReceta}`, {
    token: tokenFinal,
    body: {
      titulo: 'Receta editada',
      ingredientes: [{ nombre: 'Papa', cantidad: 2, unidad: 'kg' }],
    },
  });
  check(
    'PUT /recipes/:id actualiza y reemplaza ingredientes',
    editar.status === 200 &&
      editar.datos?.receta?.titulo === 'Receta editada' &&
      editar.datos?.receta?.ingredientes?.length === 1,
    `status=${editar.status}`,
  );

  const sinToken = await llamar('POST', '/recipes', { body: { titulo: '_intrusa' } });
  check('POST /recipes sin token → 401', sinToken.status === 401, `status=${sinToken.status}`);

  // 8) Aislamiento entre usuarios: otro usuario no ve la receta ajena
  const correo2 = `test-auth2-${Date.now()}@sazonlab.test`;
  await llamar('POST', '/auth/registro', {
    body: { nombre: 'Otro', correo: correo2, contrasena: pass0 },
  });
  const token2 = (
    await llamar('POST', '/auth/login', { body: { correo: correo2, contrasena: pass0 } })
  ).datos?.token;
  const ajena = await llamar('GET', `/recipes/${idReceta}`, { token: token2 });
  check('usuario ajeno no ve receta privada → 404', ajena.status === 404, `status=${ajena.status}`);
  const lista2 = await llamar('GET', '/recipes', { token: token2 });
  check('lista ajena no incluye la receta', !lista2.datos?.recetas?.some((r) => r.id === idReceta));

  // 9) Borrado (papelera)
  const borrar = await llamar('DELETE', `/recipes/${idReceta}`, { token: tokenFinal });
  check('DELETE /recipes/:id → papelera', borrar.status === 200, `status=${borrar.status}`);
  const listaTras = await llamar('GET', '/recipes', { token: tokenFinal });
  check(
    'la receta ya no aparece en la lista activa',
    !listaTras.datos?.recetas?.some((r) => r.id === idReceta),
  );

  // 10) Panel de administración (RF-22 — Fase 9)
  const ADMIN_CORREO = process.env.ADMIN_CORREO || 'admin@sazonlab.test';
  const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'SazonLab-Admin-2026';

  const loginAdmin = await llamar('POST', '/auth/login', {
    body: { correo: ADMIN_CORREO, contrasena: ADMIN_PASS },
  });
  check(
    'login de administrador (seed)',
    loginAdmin.status === 200 && loginAdmin.datos?.usuario?.rol === 'admin',
    `status=${loginAdmin.status} rol=${loginAdmin.datos?.usuario?.rol}`,
  );
  const tokenAdmin = loginAdmin.datos?.token;
  if (!tokenAdmin) {
    console.log('  (se omite la sección admin: no hay cuenta admin — reinicia dev:server)');
  } else {
    const listaAdmin = await llamar('GET', '/admin/usuarios', { token: tokenAdmin });
    check(
      'GET /admin/usuarios lista cuentas',
      listaAdmin.status === 200 && listaAdmin.datos?.usuarios?.length >= 1,
      `status=${listaAdmin.status} total=${listaAdmin.datos?.usuarios?.length}`,
    );

    const sinTokenAdmin = await llamar('GET', '/admin/usuarios');
    check(
      'GET /admin/usuarios sin token → 401',
      sinTokenAdmin.status === 401,
      `status=${sinTokenAdmin.status}`,
    );
    const comoUsuario = await llamar('GET', '/admin/usuarios', { token: tokenFinal });
    check(
      'GET /admin/usuarios con rol usuario → 403',
      comoUsuario.status === 403,
      `status=${comoUsuario.status}`,
    );

    // Crear cuenta desde el panel
    const correoAdminCreado = `test-admin-${Date.now()}@sazonlab.test`;
    const crearCuenta = await llamar('POST', '/admin/usuarios', {
      token: tokenAdmin,
      body: {
        nombre: 'Creada por panel',
        correo: correoAdminCreado,
        contrasena: 'panel-clave-99',
        rol: 'usuario',
      },
    });
    check(
      'POST /admin/usuarios crea cuenta',
      crearCuenta.status === 201 && crearCuenta.datos?.usuario?.rol === 'usuario',
      `status=${crearCuenta.status}`,
    );
    const idCreada = crearCuenta.datos?.usuario?.id;

    const dupAdmin = await llamar('POST', '/admin/usuarios', {
      token: tokenAdmin,
      body: { nombre: 'Dup', correo, contrasena: 'x'.repeat(10), rol: 'usuario' },
    });
    check(
      'POST /admin/usuarios correo duplicado → 409',
      dupAdmin.status === 409,
      `status=${dupAdmin.status}`,
    );

    const crearComoUsuario = await llamar('POST', '/admin/usuarios', {
      token: tokenFinal,
      body: { nombre: 'X', correo: `x-${Date.now()}@t.test`, contrasena: 'x'.repeat(10) },
    });
    check(
      'POST /admin/usuarios con rol usuario → 403',
      crearComoUsuario.status === 403,
      `status=${crearComoUsuario.status}`,
    );

    // Protección de la propia cuenta: no auto-degradarse
    const idAdmin = loginAdmin.datos?.usuario?.id;
    const autoDegradar = await llamar('PATCH', `/admin/usuarios/${idAdmin}`, {
      token: tokenAdmin,
      body: { rol: 'usuario' },
    });
    check(
      'PATCH auto-degradarse → 400',
      autoDegradar.status === 400,
      `status=${autoDegradar.status}`,
    );

    // Cambiar rol de la cuenta creada
    const cambiarRol = await llamar('PATCH', `/admin/usuarios/${idCreada}`, {
      token: tokenAdmin,
      body: { rol: 'admin' },
    });
    check(
      'PATCH cambia rol a admin',
      cambiarRol.status === 200 && cambiarRol.datos?.usuario?.rol === 'admin',
      `status=${cambiarRol.status}`,
    );
    const volverUsuario = await llamar('PATCH', `/admin/usuarios/${idCreada}`, {
      token: tokenAdmin,
      body: { rol: 'usuario' },
    });
    check('PATCH vuelve a usuario', volverUsuario.status === 200, `status=${volverUsuario.status}`);

    // Inactivar: revoca el acceso de inmediato (JWT vigente incluido)
    const tokenCreada = (
      await llamar('POST', '/auth/login', {
        body: { correo: correoAdminCreado, contrasena: 'panel-clave-99' },
      })
    ).datos?.token;
    check('la cuenta creada puede iniciar sesión', Boolean(tokenCreada));

    const desactivar = await llamar('PATCH', `/admin/usuarios/${idCreada}`, {
      token: tokenAdmin,
      body: { estado: 'inactivo' },
    });
    check('PATCH inactiva la cuenta', desactivar.status === 200, `status=${desactivar.status}`);

    if (tokenCreada) {
      const revocado = await llamar('GET', '/auth/me', { token: tokenCreada });
      check(
        'token vigente de cuenta inactiva → 401 (revocación inmediata)',
        revocado.status === 401,
        `status=${revocado.status}`,
      );
    }
    const loginInactiva = await llamar('POST', '/auth/login', {
      body: { correo: correoAdminCreado, contrasena: 'panel-clave-99' },
    });
    check(
      'login de cuenta inactiva → 403',
      loginInactiva.status === 403,
      `status=${loginInactiva.status}`,
    );

    // Reactivar para dejar la BD limpia
    const reactivar = await llamar('PATCH', `/admin/usuarios/${idCreada}`, {
      token: tokenAdmin,
      body: { estado: 'activo' },
    });
    check('PATCH reactiva la cuenta', reactivar.status === 200, `status=${reactivar.status}`);
  }

  console.log(
    `\nResultado: ${fallos === 0 ? 'TODAS LAS COMPROBACIONES PASAN ✅' : `${fallos} FALLO(S) ❌`}`,
  );
  process.exitCode = fallos === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error('Error inesperado:', err.message);
  process.exitCode = 1;
});
