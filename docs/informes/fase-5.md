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
| 15 | Compartir con **imagen PNG** (canvas) y **PDF** además de enlace/texto | `app/src/services/exportarReceta.js`, `RecetaDetalle.jsx` |
| 16 | Exportar/importar JSON movido de «Mis recetas» a **Ajustes → Datos** (RF-21) | `Ajustes.jsx`, `MisRecetas.jsx` |
| 17 | Libro: portada decorativa, botón PDF, **índice con número de página** (medido vs. A4) y **página fija de medidas** | `LibroCocina.jsx`, `styles/index.css` |
| 18 | Fix «Explorar»: cobertura de áreas sondeada y cacheada (30 días) + `/filtros` filtrado y sin duplicados | `server/src/services/coberturaAreas.js`, `mealdb.js` (`contarArea`), `routes/search.js`, `index.js` (sondeo al arrancar) |
| 19 | Filtros de Explorar con carga perezosa, error + reintentar y deduplicación | `app/src/pages/Buscar.jsx` |
| 20 | **Checklist de ingredientes** con persistencia por receta | `app/src/pages/RecetaDetalle.jsx` |
| 21 | **Página `/medidas`**: conversor + 3 tablas de equivalencias es/en (módulo compartido) | `app/src/data/medidas.js`, `pages/Medidas.jsx`, `App.jsx`, `AppFooter.jsx` |
| 22 | Fix campos en modo claro: relleno sólido por token `--muted` + sombra interior/hover/foco | `app/src/styles/index.css` (`.field`) |
| 23 | Suites nuevas de la tanda | `scripts/verificar-ui-f5.cjs` (37), `scripts/verificar-busqueda.mjs` ampliado (68) |
| 24 | **Checklist ↔ faltantes**: marcar un ingrediente como «lo tengo» lo saca del aviso «Te faltan…» y del marcado en rojo | `app/src/pages/RecetaDetalle.jsx` |
| 25 | Avisos informativos ⓘ retirados («Marcados en rojo…», «Valores fijos de referencia…», panel «Consejo»); panel lateral del formulario solo al editar | `RecetaDetalle.jsx`, `Medidas.jsx`, `RecetaForm.jsx` |
| 26 | Chevron del perfil gira (rotate-180) al abrir/cerrar el menú | `app/src/components/layout/AppHeader.jsx` |
| 27 | `.field` vuelve a translúcido (visible en claro sin perder Liquid Glass) + **tema glass de SweetAlert2** (popup, inputs, botones) | `app/src/styles/index.css` |
| 28 | **Exportación robusta**: `imprimirReceta` async (espera la foto máx. 4 s, limpieza solo en `afterprint` + respaldo 5 min) y ancla PNG diferida (15 s) | `app/src/services/exportarReceta.js`, `RecetaDetalle.jsx` |
| 29 | Verificación real de exportación: PDF con `printToPDF` (2 páginas, foto embebida) y PNG capturado del canvas (estilos + foto) | Evidencia en §5 |

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
8. **Checklist y faltantes son un mismo estado.** «Te faltan X de Y» se
   calcula sobre los ingredientes no disponibles **y no marcados en el
   checklist**: marcar una casilla («lo tengo») descuenta el ingrediente del
   aviso y de la lista en rojo, en lugar de mantener dos estados
   independientes.
9. **SweetAlert2 tematizado sin `!important`.** SweetAlert2 v11 importa su
   CSS después del nuestro y usa selectores `:where()` de casi nula
   especificidad: se le contrarresta prefijando (`html .swal2-container …`)
   con glass de `--card` + blur, botón confirmar `--primary` y cancelar
   `--card` — aplica a los 12 temas × 3 modos.
10. **Impresión sin carreras.** `imprimirReceta` es async: espera la foto de
    la comida (máx. 4 s) antes de `window.print()` y solo limpia la vista en
    `afterprint` (respaldo a 5 min). En Electron `print()` no bloquea el
    hilo: el respaldo corto de 1,5 s anterior borraba la receta y el PDF
    salía en blanco.

---

## 4. Requisitos cubiertos

| RF | Requisito | Evidencia |
|----|-----------|-----------|
| RF-05 | Ver detalle de receta | Ruta unificada propia/pública/externa |
| RF-06 | Crear/editar recetas propias | `RecetaForm.jsx` + `POST/PUT /api/recipes` |
| RF-07 | Versiones restaurables | Snapshot completo + `POST /:id/versiones/:v/restaurar` |
| RF-08 | Papelera (borrado suave 30 días) | `Papelera.jsx` + `DELETE /:id` + `?permanente=1` |
| RF-09 | Favoritos | `Favoritos.jsx` + `/api/favorites` (propias y externas) |
| RF-12 | Compartir recetas | Visibilidad pública + diálogo (enlace / texto / **imagen PNG** / **PDF**) |
| RF-21 | Exportar/importar recetas | `GET /exportar`, `POST /importar`, UI en **Ajustes → Datos** |
| — | Libro de cocina PDF (cliente) | `/libro`: portada + **índice con páginas** + **página fija de medidas** + `@media print` |
| — | Medidas y conversor (cliente) | `/medidas` + página fija del libro (valores fijos es/en) |
| — | Checklist de ingredientes (cliente) | `RecetaDetalle.jsx` + `localStorage` por receta |

---

## 5. Verificación

| Comando | Resultado |
|---------|-----------|
| `npm run verificar:recetas` | ✅ 39/39 |
| `npm run verificar:ui-f5` | ✅ 37/37 (JSON, libro/índice/PDF, compartir imagen+PDF, checklist, Explorar, medidas) |
| `npm run verificar:busqueda` | ✅ 68/68 (incluye: cada área de `/filtros` con recetas reales) |
| `npm run lint` | ✅ 0 errores, 0 avisos |
| `npm run format` | ✅ aplicado |
| `npm run build:app` | ✅ (73 módulos) |
| `npm run build:landing` | ✅ |
| `npm run verificar:contraste` | ✅ 36/36 combinaciones |
| `npm run verificar:temas` | ✅ 4/4 en dev (Electron) |
| `npm run verificar:auth` | ✅ 27/27 |
| Demo `localhost:5173` | ✅ 200 |
| API `localhost:3001/api/health` | ✅ 200 |
| `GET /api/search/filtros` | ✅ 14 categorías, **29 áreas** (todas con recetas; antes 195 casi todas vacías) |

#### Evidencia de exportación (PNG y PDF)

| Prueba | Resultado |
|--------|-----------|
| PDF real de una receta externa (`printToPDF`) | ✅ 153 KB, **2 páginas A4**, JPEG de la comida embebido (`DCTDecode`), verificado en el visor: cabecera, badge, título, foto, columnas Ingredientes/Preparación en color primario, todo en español |
| Vista de impresión (`Emulation.setEmulatedMedia: print`) | ✅ Oculta la app (`#root`), muestra solo la receta con estilos y foto |
| PNG generado por la app (blob del canvas) | ✅ 1,35 MB capturado: tarjeta estilizada con encabezado de marca, **foto de la comida**, ingredientes y pasos |
| Descarga de archivos en Electron (esta máquina) | ⚠️ **Hallazgo de entorno, no de la app**: con Electron 44.10.2 toda descarga termina `interrupted` — repro mínimo con `BrowserWindow` de stock y URL `data:` (sin código de la app), con `setSavePath` en Temp/OneDrive/Downloads y sin él; disco con 398 GB libres. El PNG se genera correctamente (contenido verificado) y la descarga funciona en navegadores normales (Chrome/Edge), donde la app web es el destino principal |

### Cumplimiento de requisitos obligatorios del cliente (tanda)

| Requisito | Estado | Evidencia |
|-----------|--------|-----------|
| Electron | ✅ | Suites UI corren con `electron`; builds `build:app` |
| 12 temas × claro/oscuro/alto contraste | ✅ | `verificar:temas` 4/4 + `verificar:contraste` 36/36 (`.field` ahora por tokens `--muted`/`--primary`) |
| Estructura semántica (header, sidebar, footer, contenido) | ✅ | Landmarks intactos; secciones nuevas usan `<header>`/`<section aria-labelledby>`/`<footer>` |
| Apartado visual siempre en glassmode | ✅ | `.surface-section` = `glass-panel`; el libro es documento imprimible (excección `@media print`) |
| Font Awesome | ✅ | `fa-ruler-combined`, `fa-right-left`, `fa-eraser`, `fa-book-bookmark`, etc. |
| SweetAlert2 | ✅ | Diálogo de compartir, confirmaciones de checklist/papelera |
| Notificaciones y popups | ✅ | Toasts propios + SweetAlert2 (selector de tema, compartir) |

---

## 6. Pendientes registrados

- Páginas legales de Privacidad y Términos → **Fase 7**.
- Toasts/modales propios y SweetAlert2 unificado → **Fase 6**.
- `.exe` con SQLite local + assets compilados → **Fase 8**.
- Descarga de archivos interrumpida en Electron 44 en **esta máquina** (entorno, repro mínimo sin código de la app): el PNG se genera bien y la descarga funciona en navegadores normales; reevaluar al empacar en **Fase 8**.
