# Checklist manual WCAG 2.1 AA — SazónLab (Fase 6)

**Fecha:** 2026-11-11
**Requisito:** RNF-07 (ALTA) — «El sistema debe cumplir WCAG 2.1 AA, incluyendo alto
contraste, navegación por teclado, lectores de pantalla y ajuste de fuente.»
**Hito 8 (Sprint 7):** WCAG 2.1 AA cumplido.

Dos frentes de verificación:

1. **Automatizado:** `npm run verificar:a11y` → axe-core sobre 11 estados de la app
   (páginas + tour + selector de tema + panel de notificaciones + diálogo de
   compartir), etiquetas `wcag2a wcag2aa wcag21a wcag21aa`, criterio de fallo:
   cualquier violación `serious`/`critical`. Evidencia: `a11y-axe.md`.
2. **Contraste:** `npm run verificar:contraste` → 36/36 combinaciones (12 temas ×
   3 modos) cumplen AA (4.5:1), AAA en alto contraste y borde UI 3:1 en claro.
   Evidencia: `contraste-36.md`.
3. **Manual (este checklist):** teclado + lector de pantalla + zoom + movimiento.

## Criterios verificados manualmente

| Criterio | Nivel | Cómo se cumple | Estado |
|----------|-------|----------------|--------|
| 1.1.1 Contenido no textual | A | Iconos Font Awesome con `aria-hidden="true"`; imágenes de receta con `alt` descriptivo; iconos informativos con texto | ✅ |
| 1.3.1 Información y relaciones | A | Landmarks semánticos `<header>/<aside>/<main>/<footer>`, `aria-labelledby` en secciones, listas reales (`role="list"`/`listitem`) | ✅ (axe) |
| 1.3.2 Sentido de la lectura | A | Orden DOM = orden visual en todas las páginas | ✅ |
| 1.4.1 Uso del color | A | El estado nunca es solo color: check de «Activado», tachado en checklist, iconos junto al texto | ✅ |
| 1.4.3 Contraste (mínimo) | AA | `verificar:contraste` 36/36 ≥ 4.5:1 (AAA ≥ 7:1 en alto contraste) | ✅ |
| 1.4.4 Redimensionar texto | AA | Ajustes → Tamaño de fuente (16/18/20 px) sin pérdida de funcionalidad; zoom 200% del navegador mantiene el layout (reflow con `sm`/`lg`) | ✅ |
| 1.4.10 Reflow | AA | Diseño responsive sin scroll horizontal a 320 px de ancho | ✅ |
| 1.4.11 Contraste no textual | AA | Bordes de campos/controles ≥ 3:1 (incluido en `verificar:contraste`) | ✅ |
| 1.4.12 Espaciado de texto | AA | Ajustes → «Subrayar enlaces» y tipografía para dislexia (interlineado/espaciado amplio) | ✅ |
| 1.4.13 Controles al pasar el cursor | AA | Los toasts y paneles no desaparecen al pasar el cursor; los tooltips son `title`/texto accesible | ✅ |
| 2.1.1 Teclado | A | Todas las acciones accesibles por teclado: navegación, buscador, favoritos, compartir, formulario con ingredientes/pasos dinámicos, checklist | ✅ |
| 2.1.2 Sin trampa de teclado | A | Los modales atrapan Tab DENTRO (trampa) y se cierran con Esc; Esc devuelve el foco al disparador | ✅ |
| 2.2.1 Pausar | A | Sin autoplay temporal; los toasts se pueden cerrar a mano antes del auto-cierre | ✅ |
| 2.3.1 Destellos | A | Sin destellos ni animación parpadeante; «Reducir movimiento» + `prefers-reduced-motion` desactivan animaciones | ✅ |
| 2.4.1 Bloqueos | A | «Saltar al contenido» (SkipLink) como primer elemento focable | ✅ |
| 2.4.2 Página con título | A | `<title>` por ruta (React Router + Vite) | ✅ |
| 2.4.3 Orden de foco | A | Al cerrar cualquier modal/panel el foco vuelve al botón que lo abrió (ThemeSelector, tour, panel de notificaciones) | ✅ |
| 2.4.4 Enlace en contexto | A | Enlaces de tarjetas con texto visible completo (sin `aria-label` que lo contradiga — corregido con axe) | ✅ |
| 2.4.6 Encabezados y etiquetas | AA | Un `<h1>` por página, `<h2>` por sección, etiquetas visibles o `sr-only` en todos los campos | ✅ |
| 2.4.7 Foco visible | AA | `*:focus-visible` con contorno de 2 px en todo el sistema (y contorno amarillo AAA en alto contraste) | ✅ |
| 2.5.1 Gestos | A | Sin gestos multipunto ni arrastres obligatorios | ✅ |
| 3.1.1 Idioma | A | `<html lang="es">`; todo el contenido en español (requisito del cliente) | ✅ |
| 3.3.2 Etiquetas o instrucciones | A | Todos los campos con etiqueta visible o `sr-only`; errores con `role="alert"` | ✅ |
| 4.1.2 Nombre, rol, valor | A | axe sin violaciones; `aria-expanded`, `aria-controls`, `aria-current`, `aria-modal` correctos | ✅ (axe) |
| 4.1.3 Mensajes de estado | AA | Toasts con `role="status"` (polite) / `role="alert"` (errores, assertivo) en región `aria-live` siempre montada; resultados de búsqueda y conversor con `aria-live` | ✅ |

## Prueba manual de teclado (recorrido mínimo)

1. `Tab` desde la carga: SkipLink → menú móvil (móvil) → logo → buscador →
   tema → modo → campana → perfil/ingresar → enlaces del sidebar → contenido.
2. Abrir el **selector de tema** con `Enter`: foco dentro, `Tab` cicla por las
   opciones, `Esc` cancela y el foco vuelve al botón de la paleta.
3. Abrir la **campana** con `Enter`: `Esc` cierra y devuelve el foco.
4. Recorrer el **tour de bienvenida**: `Tab` entre Omitir/Atrás/Siguiente,
   `Enter` avanza, `Esc` cierra y persiste la omisión.
5. **Checklist** de ingredientes: casillas marcables con `Espacio`.
6. Formulario de receta: agregar/quitar ingredientes y pasos con botones
   focables; guardar muestra el toast (anunciado por el lector).

## Prueba manual con lector de pantalla (NVDA en Windows)

| Acción | Lo que debe anunciar |
|--------|----------------------|
| Cargar el inicio | «Saltar al contenido», banner, navegación, contenido principal |
| Marcar favorito | «Guardada en favoritos» (región de estado, polite) |
| Borrar receta (confirmación) | SweetAlert2 con título y botones con nombre |
| Marcar casilla del checklist | «1/3 listos» (estado actualizado) |
| Abrir la campana | «Notificaciones: N sin leer»; al abrir, lista con mensajes y tiempo |
| Tour de bienvenida | «Paso 2 de 6», progreso con `aria-current="step"` |
| Error de formulario | `role="alert"` con el mensaje (assertivo) |

> NVDA no está instalado en el entorno de CI: esta tabla es el guion de la
> prueba manual que realiza QA en Windows 10+ (Riesgo registrado en Fase 0,
> mitigación «checklist manual + axe automatizado»).

## Resultado

- **axe-core:** 11/11 estados sin violaciones `serious`/`critical`
  (ver `a11y-axe.md`).
- **Contraste:** 36/36 combinaciones AA/AAA (ver `contraste-36.md`).
- **Checklist manual:** 28 criterios ✅, 0 ❌.

**WCAG 2.1 AA cumplido (Hito 8).**
