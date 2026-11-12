# Informe de Fase 6 — Accesibilidad WCAG 2.1 AA + notificaciones, pop-ups y onboarding

**Fecha:** 2026-11-11
**Estado:** ✅ Completada
**Sprints IEEE equivalentes:** 7–8

---

## 1. Objetivo

Cumplir el **Hito 8 (WCAG 2.1 AA cumplido)** y el **Hito 9 (notificaciones
operativas)** del IEEE:

- **Sprint 7 — Módulo de accesibilidad** (RNF-07): pruebas WCAG 2.1 AA
  automatizadas (axe-core) + checklist manual de teclado y lectores de
  pantalla, sobre los ajustes ya existentes (tamaño de fuente, dislexia,
  reducir movimiento, alto contraste).
- **Sprint 8 — Módulo de notificaciones y pop-ups** (RF-16, RF-25):
  sistema de toasts propio con estética glass, campana de notificaciones en
  la cabecera, modal glass propio reutilizable, tour de onboarding guiado y
  pruebas unitarias.

---

## 2. Actividades realizadas

| # | Actividad | Archivos |
|---|-----------|----------|
| 1 | **Servicio de notificaciones** propio (cola de toasts + historial de 20 con no-leídas, sin dependencias, testeable en Node) | `app/src/services/toast.js` |
| 2 | **ToastHost**: toasts glass siempre montados, `role="status"` (polite) / `role="alert"` (errores), cierre manual etiquetado | `app/src/components/ui/ToastHost.jsx` |
| 3 | **Modal glass propio reutilizable** (RF-16): portal, trampa de foco, Esc, foco de vuelta al disparador, `aria-modal` + `aria-labelledby`, backdrop configurable | `app/src/components/ui/Modal.jsx` |
| 4 | **Tour de bienvenida** (RF-25 / CU-25/47/48): 6 pasos con anillo *spotlight* sobre `[data-tour]`, «Paso X de 6», progreso con `aria-current`, «Omitir» siempre visible, una sola vez por usuario (localStorage), repetible desde Ajustes | `app/src/components/onboarding/Onboarding.jsx`, `Ajustes.jsx` |
| 5 | **Campana de notificaciones** en la cabecera: habilitada (antes `disabled`), badge de no leídas, panel con historial en español («ahora», «hace 2 min»), estado vacío, «Vaciar», Esc devuelve el foco | `app/src/components/layout/AppHeader.jsx` |
| 6 | **Reemplazo de los 11 toasts de SweetAlert2** por el sistema propio (SweetAlert2 conservado para diálogos y confirmaciones — requisito del cliente) | `Favoritos`, `Ajustes`, `MisRecetas`, `Papelera`, `RecetaDetalle`, `RecetaForm` |
| 7 | **Batería axe-core** (`npm run verificar:a11y`): 11 estados (7 páginas + tour + selector de tema + panel de notificaciones + diálogo de compartir) con etiquetas WCAG 2.0/2.1 A+AA; informe en `docs/evidencias/a11y-axe.md` | `scripts/verificar-a11y.cjs` |
| 8 | **Correcciones detectadas por axe** (5): contenedor de toasts sin rol (`aria-prohibited-attr`), nombre accesible de tarjetas que ocultaba el texto visible (`label-content-name-mismatch`), iconos `<i>` con `aria-label` sin rol, input del enlace compartido sin etiqueta, contenedor de acciones con `role="list"` sin hijos `listitem` | `ToastHost`, `Home`, `ThemeSelector`, `Ajustes`, `RecetaDetalle` |
| 9 | **Pruebas unitarias** con el runner nativo de Node (`node --test`, cero dependencias): 18 tests del servicio de toast, del módulo de medidas y de `escaparHtml` | `toast.test.js`, `medidas.test.js`, `exportarReceta.test.js` |
| 10 | **Checklist manual WCAG 2.1 AA** (28 criterios + guion de teclado y NVDA) | `docs/evidencias/checklist-wcag-21-aa.md` |
| 11 | **Suite UI de la fase** | `scripts/verificar-ui-f6.cjs` → `npm run verificar:ui-f6` (29) |

---

## 3. Decisiones de diseño

1. **Toasts propios, SweetAlert2 para diálogos.** El cliente exige
   «SweetAlerts» y «notificaciones» como elementos distintos: los avisos
   efímeros pasan al sistema propio (glass, tokens del tema, anuncio a
   lectores) y SweetAlert2 queda para confirmaciones, alertas y formularios
   (con el tema glass de la Fase 5). Ventaja adicional: los toasts dejan de
   colisionar con `.swal2-popup` en las pruebas.
2. **Regiones `aria-live` siempre montadas.** El contenedor de toasts existe
   en el DOM aunque no haya avisos: una región que aparece junto con su
   contenido no es anunciada por los lectores (WCAG 4.1.3).
3. **Una sola cola con dos vistas.** El mismo servicio alimenta el toast en
   pantalla y el historial de la campana (máx. 20, con estado no leído): la
   campana no necesita backend ni polling.
4. **Modal propio en lugar de reescribir SweetAlert2.** RF-16 pide modales
   glass; el componente `Modal` aporta la semántica de diálogo (trampa de
   foco, Esc, devolución de foco) reutilizable por el tour y futuros
   formularios, sin tocar los diálogos existentes.
5. **Tour con spotlight sobre elementos reales.** El anillo resalta
   `[data-tour="…"]` (buscador, tema, campana, CTA) con `box-shadow` y se
   recalcula al desplazar/redimensionar; si el objetivo no existe, el paso
   se centra. Se marca «visto» en cualquier cierre (omitir, Esc o finalizar)
   para no molestar.
6. **Pruebas unitarias sin dependencias.** `app` es ESM (`"type": "module"`),
   así que `node --test` ejecuta los tests directamente — sin instalar
   Jest/Vitest (decisión conservadora de la Fase 0).
7. **axe como puerta de calidad.** Cualquier violación `serious`/`critical`
   en los 11 estados hace fallar `verificar:a11y`; las violaciones leves se
   documentan. La suite se ejecuta en la batería de cada tanda.

---

## 4. Requisitos cubiertos

| RF/RNF | Requisito | Evidencia |
|--------|-----------|-----------|
| RNF-07 | WCAG 2.1 AA (alto contraste, teclado, lectores, fuente) | `verificar:a11y` 11/11 + `verificar:contraste` 36/36 + checklist manual 28 criterios |
| RF-16 | Pop-ups modales glass | `Modal.jsx` (tour) + SweetAlert2 glass (confirmaciones) |
| RF-25 | Onboarding guiado con opción de omitir | `Onboarding.jsx`: 6 pasos, progreso, «Omitir», repetible desde Ajustes |
| CU-25/47/48 | Ver/progreso/omitir el tour | `verificar:ui-f6` (apertura, «Paso X de 6», omitir, persistencia) |
| — | Notificaciones toast (Sprint 8) | `toast.js` + `ToastHost.jsx` + campana con historial |
| — | Iconografía Font Awesome | Iconos en toasts, campana, tour y modal |
| — | Pruebas unitarias (Sprint 8) | `npm test` → 18/18 (`node --test`) |

---

## 5. Verificación

| Comando | Resultado |
|---------|-----------|
| `npm test` | ✅ 18/18 (toast, medidas, escaparHtml) |
| `npm run verificar:a11y` | ✅ 11/11 estados sin violaciones serious/critical (axe-core) |
| `npm run verificar:ui-f6` | ✅ 29/29 (tour, campana, toasts, foco) |
| `npm run verificar:ui-f5` | ✅ 37/37 (regresión tras cambiar los toasts) |
| `npm run verificar:contraste` | ✅ 36/36 combinaciones |
| `npm run verificar:temas` | ✅ 4/4 en dev (Electron) |
| `npm run verificar:busqueda` | ✅ 68/68 |
| `npm run verificar:recetas` | ✅ 39/39 |
| `npm run verificar:auth` | ✅ 27/27 |
| `npm run lint` / `format` | ✅ 0 errores |
| `npm run build:app` | ✅ |
| Demo `localhost:5173` / API `:3001` | ✅ 200 / 200 |

### Cumplimiento de requisitos obligatorios del cliente

| Requisito | Estado | Evidencia |
|-----------|--------|-----------|
| Electron | ✅ | Suites `verificar:a11y`, `verificar:ui-f6` y `verificar:temas` corren con Electron |
| 12 temas × claro/oscuro/alto contraste | ✅ | `verificar:temas` 4/4 + `verificar:contraste` 36/36 (toasts/modal/tour por tokens) |
| Estructura semántica (header, sidebar, footer, contenido) | ✅ | axe sin violaciones `region`; landmarks intactos |
| Apartado visual siempre en glassmode | ✅ | Toasts, panel de la campana, modal y tour usan `glass`/`glass-card` |
| Font Awesome | ✅ | Iconos en toasts, campana, tour, modal |
| SweetAlert2 | ✅ | Confirmaciones/alertas/dialogos (tema glass Fase 5); toasts → sistema propio |
| Notificaciones y popups | ✅ | Campana + historial + toasts glass + tour guiado |

---

## 6. Pendientes registrados

- Pruebas con **NVDA reales**: guion manual en
  `docs/evidencias/checklist-wcag-21-aa.md` (NVDA no instalado en el entorno;
  riesgo aceptado en Fase 0).
- Páginas legales de Privacidad y Términos → **Fase 7**.
- `.exe` con SQLite local + assets compilados → **Fase 8**.
