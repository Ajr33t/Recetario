# Informe de Fase 5 — CRUD de recetas en UI + favoritos + papelera + versiones + compartir + export/import + libro de cocina

**Fecha:** 2026-11-10
**Estado:** ✅ Completada
**Sprints IEEE equivalentes:** 4–5, 9

---

## 1. Objetivo

Implementar el ciclo de vida completo de las recetas del usuario en la
interfaz (RF-05 a RF-12 y RF-21), sobre la capa de servidor creada en la
Fase 3 y ampliada en esta fase: favoritos, papelera con retención,
historial de versiones restaurables, compartir por enlace,
exportar/importar JSON y la generación del **libro de cocina en PDF**
(idea solicitada por el cliente).

---

## 2. Actividades realizadas

| # | Actividad | Archivos |
|---|-----------|----------|
| 1 | Middleware `opcionalAuth` (detalle público con sesión opcional) | `server/src/middleware/auth.js` |
| 2 | Migración: columna `recipes.externo_id` + índice | `server/src/db/database.js` |
| 3 | Rutas de recetas ampliadas: detalle público, versiones con snapshot completo, restaurar, papelera, borrado permanente, exportar/importar JSON, `importarExterna()` | `server/src/routes/recipes.js` |
| 4 | Router de favoritos: listar, alternar, guardar recetas externas de TheMealDB, estado por `externo_id` | `server/src/routes/favorites.js` (montado en `/api/favorites`) |
| 5 | Formulario completo de recetas (crear/editar): ingredientes y pasos dinámicos, etiquetas, subida de foto con redimensionado en canvas, visibilidad, historial de versiones con restaurar | `app/src/pages/RecetaForm.jsx` |
| 6 | «Mis recetas» real: acciones ver/editar/eliminar (SweetAlert2), modo selección para el libro, exportar/importar JSON, enlace a papelera | `app/src/pages/MisRecetas.jsx` |
| 7 | «Favoritos» real: lista, quitar, estados de invitado/cargando/vacío | `app/src/pages/Favoritos.jsx` |
| 8 | «Papelera»: restaurar y borrado permanente con confirmación (casilla SweetAlert2) | `app/src/pages/Papelera.jsx` |
| 9 | Detalle unificado (propia/pública/externa): corazón de favorito, diálogo de compartir, editar/eliminar si es tuya, marcado de ingredientes faltantes, chip «Traducido al español» | `app/src/pages/RecetaDetalle.jsx` |
| 10 | Libro de cocina imprimible: portada + índice + una receta por página | `app/src/pages/LibroCocina.jsx` |
| 11 | Rutas nuevas (`/recetas/nueva`, `/recetas/:id/editar`, `/papelera`, `/libro`) y CTA «Crear receta» del Home | `app/src/App.jsx`, `app/src/pages/Home.jsx` |
| 12 | Estilos `@media print` (oculta chrome de la app, negro sobre blanco, saltos de página) + clase `no-print` en landmarks | `app/src/styles/index.css`, `AppHeader/AppSidebar/AppFooter/SkipLink` |
| 13 | Última búsqueda de ingredientes guardada en `sessionStorage` para el detalle | `app/src/pages/Buscar.jsx` |
| 14 | Suite de verificación de la fase | `scripts/verificar-recetas.mjs` → `npm run verificar:recetas` |

---

## 3. Decisiones de diseño

1. **Las recetas externas se importan como recetas del usuario.** La tabla
   `favorites` referencia `recipes` (modelo IEEE). Para que el favorito de
   una receta de TheMealDB funcione, al guardarla se importa a la colección
   del usuario con `origen='sugerida'` y `externo_id` (índice único por
   usuario → no se duplica). Ventaja: la favorita sobrevive aunque la API
   externa cambie, y aparece en «Mis recetas» y en el libro de cocina.
2. **Versiones con snapshot completo.** Cada `PUT` guarda la receta con sus
   ingredientes y pasos (`{receta, ingredientes, pasos}`), no solo la fila:
   restaurar una versión antigua recupera también la lista de ingredientes.
   Antes de restaurar, el estado actual se conserva como versión nueva (nunca
   se pierde trabajo).
3. **Detalle público con `opcionalAuth`.** `GET /api/recipes/:id` acepta
   token opcional: invitados ven recetas `publica`, la dueña ve las suyas
   (cualquier visibilidad) y recibe el indicador `favorito`. El enlace
   compartido es `…#/receta/:id` (HashRouter, compatible con `file://` de
   Electron).
4. **Libro de cocina vía impresión, sin dependencias.** En lugar de jsPDF,
   la página `/libro` renderiza un documento (portada, índice, una receta
   por página con `break-after: page`) y usa `window.print()`: el usuario elige
   «Guardar como PDF» en el diálogo nativo. Beneficio: texto seleccionable,
   cero librerías pesadas y respeta los 12 temas en pantalla.
5. **Ingredientes faltantes por comparación con la última búsqueda.**
   «Buscar» guarda los ingredientes en `sessionStorage['sazonlab:ingredientes']`
   (minúsculas) y el detalle los compara con los de la receta para mostrar el
   aviso «Te faltan X de Y» y marcar en rojo. Sin búsqueda previa no se
   muestra nada (evita falsos positivos).
6. **Sin token `warning` en el design system** (solo `danger`/`success`): el
   aviso de ingredientes faltantes usa `border-l-danger`/`text-danger`,
   coherente con el marcado rojo de la lista.
7. **Papelera con doble confirmación**: «Restaurar» es directo; «Borrar para
   siempre» exige casilla de confirmación en SweetAlert2 (irreversible).

---

## 4. Requisitos cubiertos

| RF | Requisito | Evidencia |
|----|-----------|-----------|
| RF-05 | Ver detalle de receta | Ruta unificada propia/pública/externa |
| RF-06 | Crear/editar recetas propias | `RecetaForm.jsx` + `POST/PUT /api/recipes` |
| RF-07 | Versiones restaurables | Snapshot completo + `POST /:id/versiones/:v/restaurar` |
| RF-08 | Papelera (borrado suave 30 días) | `Papelera.jsx` + `DELETE /:id` + `?permanente=1` |
| RF-09 | Favoritos | `Favoritos.jsx` + `/api/favorites` (propias y externas) |
| RF-12 | Compartir recetas | Visibilidad pública + diálogo (enlace / texto) |
| RF-21 | Exportar/importar recetas | `GET /exportar`, `POST /importar`, UI con archivo |
| — | Libro de cocina PDF (cliente) | `/libro` + `@media print` |

---

## 5. Verificación

| Comando | Resultado |
|---------|-----------|
| `npm run verificar:recetas` | ✅ 39/39 |
| `npm run lint` | ✅ 0 errores, 0 avisos |
| `npm run format` | ✅ aplicado |
| `npm run build:app` | ✅ (70 módulos, 3.5 s) |
| `npm run build:landing` | ✅ (30 módulos, 1.6 s) |
| `npm run verificar:contraste` | ✅ 36/36 combinaciones |
| `npm run verificar:temas` | ✅ 4/4 en dev (Electron) |
| `npm run verificar:auth` | ✅ 27/27 |
| `npm run verificar:busqueda` | ✅ 41/41 |
| Demo `localhost:5173` | ✅ 200 |
| API `localhost:3001/api/health` | ✅ 200 |

---

## 6. Pendientes registrados

- Páginas legales de Privacidad y Términos → **Fase 7**.
- Toasts/modales propios y SweetAlert2 unificado → **Fase 6**.
- `.exe` con SQLite local + assets compilados → **Fase 8**.
