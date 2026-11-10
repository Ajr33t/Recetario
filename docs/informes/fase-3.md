# FASE 3 — Autenticación JWT + usuarios + recetas en la nube

**Proyecto:** Recetario Inteligente — SazónLab
**Fecha:** 10/11/2026
**Estado:** ✅ Completada — pendiente de aprobación

---

## 1. Objetivo

Login y registro reales con **bcrypt + JWT**, recetas guardadas **por usuario en el servidor** (visibles desde cualquier dispositivo al iniciar sesión), recuperación de contraseña por **código de 6 dígitos al correo**, **perfil personalizable** (foto, avatar-icono, nombre, bio, color de acento) y menús de la interfaz adaptados al estado de sesión.

---

## 2. Actividades realizadas

| N° | Actividad | Resultado |
|----|-----------|-----------|
| 3.1 | Instalación de `bcryptjs` + `jsonwebtoken` (JS puro, sin scripts nativos) y `server/.env` con `JWT_SECRET` aleatorio de 64 hex | ✅ |
| 3.2 | `middleware/auth.js`: `requireAuth` (Bearer JWT, 7 días) + `firmarToken()` | ✅ |
| 3.3 | `routes/auth.js`: `POST /registro` (bcrypt 10 rondas, correo único → 409), `POST /login` (mensaje genérico 401, cuenta inactiva → 403), `GET /me` | ✅ |
| 3.4 | `routes/recipes.js`: CRUD protegido — lista (activa/papelera), detalle (propia o pública), crear con ingredientes/pasos, editar con snapshot de versión (`recipe_versions`), borrar suave (papelera) + auditoría | ✅ |
| 3.5 | Recuperación de contraseña: `POST /olvide-contrasena` (código de 6 dígitos, SHA-256 en `password_reset`, TTL 15 min, máx. 5 intentos) + `POST /restablecer-contrasena` | ✅ |
| 3.6 | `services/mailer.js`: envío real vía API Resend (`RESEND_API_KEY`, sin dependencias) o **modo demo** (código visible en pantalla fuera de producción) | ✅ |
| 3.7 | Perfil: `PUT /auth/perfil` (nombre, avatar-icono, **foto data URL**, **color #rrggbb**, bio ≤ 200) + `POST /auth/cambiar-contrasena` | ✅ |
| 3.8 | Migración de esquema: `password_reset` + columnas `users.avatar/bio/avatar_imagen/color_perfil` (ALTER seguro en BD existentes) | ✅ |
| 3.9 | Frontend: `authStore` (Zustand persist), cliente API con token automático + logout en 401, **Login** con 3 modos (entrar/crear cuenta/recuperar con 2 pasos) | ✅ |
| 3.10 | **Perfil.jsx** (`/perfil`): foto con recorte 256px en `<canvas>` + JPEG 85% (sin librerías), 12 avatar-iconos, color de acento (8 presets + selector), bio, estadísticas (recetas/miembro desde), cambio de contraseña, cerrar sesión | ✅ |
| 3.11 | **Menús por sesión**: lateral solo muestra Inicio/Ajustes/Iniciar sesión al invitado; con sesión aparecen Buscar, Mis recetas, Favoritos, Mi perfil. «Mi perfil» está **solo en el menú lateral** (decisión del cliente) | ✅ |
| 3.12 | **Inicio con contenido**: cómo funciona (3 pasos), invitación a cuenta para invitados (nube/multi-dispositivo/seguridad), CTA | ✅ |
| 3.13 | Pie: sin letrero «Liquid Glass»; «Accesibilidad» → `/ajustes` + scroll a la sección (decisión del cliente) | ✅ |
| 3.14 | `scripts/verificar-auth.mjs` → **27/27 comprobaciones** | ✅ |

---

## 3. Entregables generados

```
server/src/middleware/auth.js          # requireAuth + firmarToken (JWT 7d)
server/src/routes/auth.js              # registro, login, me, olvide/restablecer, perfil, cambiar clave
server/src/routes/recipes.js           # CRUD de recetas por usuario (protegido)
server/src/services/mailer.js          # correo real (Resend) o modo demo
server/src/db/database.js              # tabla password_reset + migraciones de perfil
server/.env                            # JWT_SECRET aleatorio (no versionado)

app/src/store/authStore.js             # sesión persistida (token + usuario)
app/src/services/api.js                # Bearer automático + logout en 401
app/src/pages/Login.jsx                # entrar / crear cuenta / recuperar con código
app/src/pages/Perfil.jsx               # foto, avatar, color, bio, stats, cambiar clave
app/src/pages/MisRecetas.jsx           # lista real desde el servidor
app/src/pages/Home.jsx                 # contenido para invitados y sesión
app/src/components/layout/AppSidebar.jsx  # menú adaptado a la sesión
app/src/components/layout/AppHeader.jsx   # menú de cuenta (sin «Mi perfil»)

scripts/verificar-auth.mjs             # 27 checks → npm run verificar:auth
docs/informes/fase-3.md                # este informe
docs/CHANGELOG.md                      # entrada Fase 3
```

---

## 4. Decisiones técnicas

1. **JWT de 7 días con `subject` = id**; el middleware adjunta `req.user` sin consultar la BD en cada request (payload con nombre/correo/rol). Logout es puramente del cliente (borrar el token); para revocación anticipada se podría añadir una lista negra en Fase 5+.
2. **Recetas en servidor = cross-device**: `recipes.user_id` + todas las rutas bajo `requireAuth`; un usuario jamás ve recetas privadas ajenas (verificado: 404 y lista filtrada).
3. **Recuperación sin revelar existencia**: `olvide-contrasena` siempre responde `ok`; el código se guarda con SHA-256 (nunca en claro), caduca en 15 min y permite 5 intentos.
4. **Correo en modo demo**: mientras no haya `RESEND_API_KEY`, el código se muestra en pantalla y se imprime en la consola del servidor — el flujo completo es probar sin configurar nada. Con la clave, sale correo real vía Resend (fetch nativo, cero dependencias).
5. **Foto de perfil**: se recorta a 256×256 y se comprime a JPEG 85% **en el navegador** (`<canvas>`, sin librerías) y viaja como data URL validada (≤ 700 KB) — evita multipart, multer y manejo de archivos estáticos. Migración con `ALTER TABLE` tolerante a BD existentes.
6. **Menús según sesión** (decisión del cliente): invitado ve solo Inicio/Ajustes/Acceso; «Mi perfil» vive en el lateral, no en el navbar.
7. **Sin aprobación de scripts npm**: `npm install` solo añadió paquetes JS puros (bcryptjs/jsonwebtoken); los scripts bloqueados de mejoras nativas siguen sin aprobarse y todo funciona.

---

## 5. Problemas encontrados y resolución

| N° | Problema | Solución |
|----|----------|----------|
| 5.1 | `bcryptjs`/`jsonwebtoken` declarados pero no instalados | `npm install` (workspaces los elevó a la raíz; sin scripts nativos nuevos) |
| 5.2 | Columnas de perfil inexistentes en BD creada en Fase 1 (`CREATE TABLE IF NOT EXISTS` no agrega columnas) | `migrarEsquema()` con `PRAGMA table_info` + `ALTER TABLE` tolerante |
| 5.3 | Sin servidor de correo real en desarrollo | `mailer.js` con 2 modos (Resend / demo visible) — el flujo siempre es testeable |
| 5.4 | `text-destructive` no existía en Tailwind (token del proyecto es `danger`) | Clase corregida a `text-danger` |
| 5.5 | Navegación durante render en `Perfil.jsx` (sin sesión) | `<Navigate to="/login" replace />` |

---

## 6. Evidencias (comandos y resultados)

```text
$ npm run lint              → ✅ 0 errores
$ npm run format            → ✅ estilo unificado
$ npm run build:app         → ✅ 331.17 kB JS
$ npm run build:landing     → ✅ 228.96 kB JS
$ npm run verificar:contraste → ✅ 36/36
$ npm run verificar:temas     → ✅ 4/4 (temas + a11y en DEV)
$ npm run verificar:auth      → ✅ 27/27:
    registro (201 / 409 duplicado / 400 inválido)
    login (200 / 401 clave mala) · /me (200 / 401 sin token)
    perfil PUT (nombre+avatar+bio ✓) · cambio de contraseña (200 + login ok)
    recuperación (código demo ✓ / código malo 400 / restablecer 200 / login ok)
    recetas: crear 201 con ingredientes+pasos · lista · detalle · editar
    seguridad: sin token 401 · usuario ajeno 404 · lista ajena sin la receta
    borrar → papelera y desaparece de la lista
$ GET /api/health           → 200 ok (SQLite)
$ GET http://localhost:5173 → 200 (demo actualizado con HMR)
```

---

## 7. Checklist de cumplimiento (Fase 3)

- [x] Registro con bcrypt + correo único
- [x] Login con JWT (7 días) y mensajes que no filtran existencia de cuentas
- [x] Recetas guardadas por usuario en el servidor (cross-device)
- [x] CRUD de recetas protegido + aislamiento entre usuarios verificado
- [x] Recuperación de contraseña por código de 6 dígitos (15 min, 5 intentos)
- [x] Envío de correo real opcional (Resend) + modo demo sin configuración
- [x] Perfil personalizable: foto, avatar-icono, nombre, bio, color de acento
- [x] Cambio de contraseña desde el perfil
- [x] Menús adaptados a la sesión (invitado vs. sesión iniciada)
- [x] Auditoría de eventos críticos (registro/login/recuperación/CRUD)
- [x] `docs/informes/fase-3.md` y `docs/CHANGELOG.md` actualizados

---

**Fase 3 completada. Esperando aprobación explícita (`APROBADO`) para iniciar la Fase 4 (búsqueda de recetas con TheMealDB + sugerencias con IA).**
