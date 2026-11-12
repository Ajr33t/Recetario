# Informe de Fase 9 — Pruebas, corrección de hallazgos, INFORME_FINAL y cierre

**Fecha:** 2026-11-11
**Estado:** ✅ Completada
**Sprint IEEE equivalente:** 11 — «Pruebas, accesibilidad, despliegue y cierre» (**Hito 12:** Cierre del proyecto)

---

## 1. Objetivo

Fase final del proyecto (Sprint 11 del IEEE). Cubre:

1. **Corrección de hallazgos**: revisión de cumplimiento de los 25 RF y cierre de las brechas detectadas.
2. **Batería de pruebas completa** (unitarias, funcionales, accesibilidad, contraste, temas, UI por fase, desktop).
3. **`docs/INFORME_FINAL.md`**: estado final de los RF, arquitectura, resultados, manual de usuario y lecciones aprendidas.
4. **README** definitivo + **CHANGELOG** cerrado.

---

## 2. Hallazgos de la revisión de cumplimiento (RF)

Al cruzar los 25 RF del IEEE con lo implementado, la revisión detectó **4 brechas** que las
fases anteriores habían asignado en el plan pero no llegó a implementar:

| RF | Descripción | Estado antes | Responsable en fase-0.md |
|----|-------------|--------------|--------------------------|
| **RF-02** | Roles y permisos (Administrador / Usuario / Invitado) | ⚠️ Parcial (roles en BD + JWT, sin gestión) | Fase 3 |
| **RF-10** | Filtros de búsqueda (dieta, tiempo, dificultad…) | ⚠️ Parcial (solo categoría/área) | Fase 4 |
| **RF-11** | Historial de búsquedas | ❌ No implementado | Fase 4 |
| **RF-22** | Gestión de usuarios por administrador | ❌ No implementado | Fase 3 |

Decisión: **cerrar las 4 brechas aquí** (el Sprint 11 incluye explícitamente «corrección de
hallazgos») para que el INFORME_FINAL reporte el 100% de los RF en cumplimiento, en lugar de
documentarlos como pendientes.

---

## 3. RF-22 — Panel de administración de usuarios

### Backend

| Elemento | Detalle |
|----------|---------|
| `requireRole(...roles)` | Middleware nuevo en `server/src/middleware/auth.js`: 401 sin sesión, 403 sin el rol. |
| Re-validación en `requireAuth` | Cada petición consulta `users.estado` en la BD: **desactivar una cuenta revoca sus JWT de inmediato** (aunque el token tenga 7 días de vigencia). |
| Seed de administrador | `asegurarAdmin()` en `initDatabase()`: si no existe ningún `rol='admin'`, crea `admin@sazonlab.test` (contraseña `SazonLab-Admin-2026`, sobrecribible con `ADMIN_CORREO` / `ADMIN_PASSWORD` en `.env`). |
| `server/src/routes/admin.js` | `GET /api/admin/usuarios` (listado con rol, estado y nº de recetas), `POST /api/admin/usuarios` (crear con rol elegido), `PATCH /api/admin/usuarios/:id` (cambiar rol y/o estado). |
| Protecciones | Todo montado tras `soloAdmin` = `requireRole('admin')` **+ re-validación del rol en la BD** (defensa contra JWT emitidos antes de degradar a un admin). No auto-degradarse ni auto-desactivarse (siempre queda ≥ 1 admin activo). 409 en correo duplicado, 400 en validaciones, 404 en usuario inexistente. |
| Auditoría | Cada creación/cambio queda en `registrarAuditoria`. |

### Frontend

- **`app/src/pages/Admin.jsx`** (ruta `/admin`): formulario de creación (nombre, correo, contraseña, rol)
  con validación + confirmación SweetAlert2; tabla de usuarios con select de rol y botón
  Inactivar/Activar (confirmación SweetAlert2 explicando la revocación inmediata); toasts propios.
- **Sidebar** (`AppSidebar.jsx`): ítem «Administración» (`fa-user-shield`) **solo visible con `rol === 'admin'`**.
- Sin rol admin → vista de acceso denegado con enlace de vuelta.

---

## 4. RF-10 — Filtros avanzados de búsqueda

**Restricción de datos:** TheMealDB no publica tiempo, dificultad ni etiquetas de dieta en sus
listados (`filter.php` solo devuelve id/nombre/imagen; el detalle sí trae ingredientes,
categoría y etiquetas). Por eso los filtros se reparten donde el dato existe:

| Filtro | Dónde | Cómo |
|--------|-------|------|
| **Ingredientes excluidos** + **dieta** (vegetariana/vegana) | Buscar (por ingredientes, nombre y Explorar) | `filtrarAvanzado()` en `server/src/routes/search.js`: si llegan los parámetros, enriquece hasta **40** recetas con `detallePorId` (caché TheMealDB, `Promise.all`) y filtra sobre el detalle en inglés; la respuesta vuelve traducida. **Coste 0 sin parámetros.** |
| **Tiempo máximo**, **dificultad**, **texto**, **etiqueta/dieta** | Mis recetas (recetas propias) | Filtro en cliente sobre los campos que la receta propia sí guarda (`tiempo_min`, `dificultad`, `etiquetas`). |
| **Categoría / área** | Buscar → Explorar | Ya existente (Fase 4). |

- **Transparencia**: las recetas no evaluables (fuera del cap de 40 o sin detalle) se reportan en
  `sin_dato` y se muestran como aviso visible («N recetas sin detalle para evaluar los filtros…»):
  **nunca se filtra en silencio**. En Mis recetas, el recuento indica cuántas excluyó un filtro
  por no tener el dato.
- Cambiar un filtro re-ejecuta la búsqueda automáticamente (`ejecutar(null, extras)` evita leer
  estados obsoletos del cierre).

---

## 5. RF-11 — Historial de búsquedas

- Servicio propio **`app/src/services/historialBusquedas.js`** (localStorage, clave
  `sazonlab:historial-busquedas`, tope **8**, deduplicado por `clave`, sin dependencias).
- **Buscar** muestra «Búsquedas recientes» con chips: cada chip **repite la búsqueda con un clic**
  (restaura modo/ingredientes/nombre/categoría y la ejecuta) y botón «Vaciar historial».
- Se guardan solo búsquedas exitosas de los 3 modos (ingredientes, nombre, explorar).

---

## 6. Batería de verificación (resultado final)

| Comando | Resultado |
|---------|-----------|
| `npm run lint` / `format` | ✅ 0 errores |
| `npm test` | ✅ 18/18 |
| `npm run verificar:a11y` | ✅ 11/11 |
| `npm run verificar:ui-f6` | ✅ 29/29 |
| `npm run verificar:ui-f5` | ✅ 58/58 (incluye **21 nuevos**: RF-10, RF-11 y panel RF-22) |
| `npm run verificar:contraste` | ✅ 36/36 |
| `npm run verificar:temas` | ✅ 4/4 |
| `npm run verificar:busqueda` | ✅ 68/68 |
| `npm run verificar:recetas` | ✅ 39/39 |
| `npm run verificar:auth` | ✅ 41/41 (incluye **15 nuevos**: panel admin RF-22) |
| `npm run verificar:cuenta` | ✅ 27/27 |
| `npm run verificar:landing` | ✅ 38/38 + axe 5/5 estados |
| `npm run verificar:desktop` | ✅ 22/22 (sobre el `.exe` regenerado con la Fase 9) |
| `build:app` / `build:landing` | ✅ |
| Demo `:5173` / API `:3001` / landing `:5174` / robots.txt | ✅ 200 × 4 |

**Total de la batería: 18 unitarias + 11 suites (373 checks) = 391 comprobaciones, todo en verde.**

### Cobertura nueva de la corrección de hallazgos

- `scripts/verificar-auth.mjs` (+15 checks): login admin seed, listado, 401/403, creación 201,
  duplicado 409, no-admin 403, auto-degradación 400, cambio de rol, inactivación → **token
  vigente 401 (revocación inmediata)** y login 403, reactivación.
- `scripts/verificar-ui-f5.cjs` (+21 checks): bloque de filtros avanzados y select de dieta en
  Buscar; historial con chips, repetición con un clic y vaciado; barra de filtros en Mis recetas
  (texto/tiempo/dificultad/etiqueta), estado vacío, recuento «Mostrando X de Y» y limpiar;
  y **panel `/admin`** (acceso denegado para usuario normal, formulario, tabla, sidebar y axe).

---

## 7. Entregables de la Fase

| Entregable | Archivo |
|------------|---------|
| Informe final (RF 25/25, arquitectura, batería, manual de usuario, lecciones aprendidas) | `docs/INFORME_FINAL.md` |
| README definitivo | `README.md` |
| CHANGELOG cerrado | `docs/CHANGELOG.md` → `[Fase 9]` |
| Este informe | `docs/informes/fase-9.md` |

---

## 8. Pendientes conocidos (heredados y registrados)

- **Code signing del `.exe`**: sin certificado, SmartScreen lo marcará como desconocido.
- **`sitemap.xml`**: se generará cuando exista dominio de publicación (el `robots.txt` ya lo referencia).
- **Contraseña del admin seed**: documentada en README/INFORME_FINAL; en producción real debe cambiarse
  (`ADMIN_PASSWORD` en `.env`) o desactivarse el seed.
