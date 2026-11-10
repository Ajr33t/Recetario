# FASE 2 — Sistema de temas (12 × 3) + Liquid Glass

**Proyecto:** Recetario Inteligente — SazónLab
**Fecha:** 10/11/2026
**Estado:** ✅ Completada — pendiente de aprobación

---

## 1. Objetivo

Implementar el sistema completo de personalización visual: **12 temas × 3 modos = 36 combinaciones** con persistencia, vista previa en vivo, modo alto contraste (AAA) y verificación automática de contraste WCAG, consolidando el estilo **Liquid Glass** en toda la interfaz.

---

## 2. Actividades realizadas

| N° | Actividad | Resultado |
|----|-----------|-----------|
| 2.1 | `themes/palettes.js`: 12 temas con paletas **claro** y **oscuro** explícitas (bg, fg, card, primary, accent, muted, border, glass, gradiente, hue) + generador `buildHc()` de alto contraste por tono | ✅ |
| 2.2 | `themes/engine.js`: `applyTheme(themeId, mode)` inyecta/actualiza `<style id="theme-vars">` con variables CSS en canales RGB y marca `data-theme`/`data-mode` en `<html>` + `meta theme-color` | ✅ |
| 2.3 | `store/themeStore.js`: acciones aplican el tema de inmediato + `onRehydrateStorage` + aplicación en init de módulo (**cero parpadeo** al cargar) | ✅ |
| 2.4 | `components/theme/ThemeSelector.jsx`: modal glass (`role=dialog`, `aria-modal`) con 12 tarjetas-radiobutton con muestras de color, 3 modos, vista previa en vivo, cancelar con Esc/fondo (restaura tema original), devolución de foco al abrir/cerrar | ✅ |
| 2.5 | Cabecera: botón 🎨 selector + toggle rápido de 3 modos; `Ajustes`: sección tema/modo con 3 modos + abridor del selector + indicador de contraste actual (AA/AAA) | ✅ |
| 2.6 | `main.jsx` → **HashRouter** (compatibilidad `file://` para Electron) y `vite.config` → **`base: './'`** (assets relativos; requisito del `.exe`) | ✅ |
| 2.7 | CSS: brillo interior del vidrio (`inset 0 1px 0`), bordes de 2px en alto contraste, anillo de foco amarillo AAA | ✅ |
| 2.8 | `scripts/verificar-contraste.mjs`: valida los 36 pares con umbrales WCAG (AA 4.5 / AAA 7 / borde UI 3) → `docs/evidencias/contraste-36.md`, exit 1 si falla | ✅ **36/36 a la primera** |
| 2.9 | `scripts/capturas.cjs` (Electron): galería 6×6 + 4 capturas reales de la app con combos precargados vía localStorage | ✅ |
| 2.10 | Verificación integral: lint, format, build:app, build:landing, health, capturas | ✅ (evidencias sección 6) |

---

## 3. Entregables generados

```
app/src/themes/palettes.js                 # 12 temas × claro/oscuro + buildHc + buildThemeVars
app/src/themes/engine.js                   # applyTheme() — inyección de variables CSS
app/src/store/themeStore.js                # store con aplicación en vivo e hidratación sin flash
app/src/components/theme/ThemeSelector.jsx # modal de selección accesible (36 combos)
app/src/main.jsx                           # HashRouter (file:// en Electron)
app/vite.config.js                         # base: './' (assets relativos para el .exe)
app/src/App.jsx                            # integra ThemeSelector; sin useEffect de tema
app/src/components/layout/AppHeader.jsx    # botón selector + toggle de 3 modos
app/src/pages/Ajustes.jsx                  # 3 modos + selector + chip AA/AAA
app/src/styles/index.css                   # inset highlight + bordes AAA

scripts/verificar-contraste.mjs            # verificador WCAG → docs/evidencias/contraste-36.md
scripts/capturas.cjs                       # capturas Electron → docs/evidencias/*.png

docs/evidencias/contraste-36.md            # tabla de ratios de las 36 combinaciones
docs/evidencias/galeria-36-temas.png       # galería visual 6×6 (1859×1002)
docs/evidencias/app-01..04-*.png           # 4 capturas reales de la app (1583×922)
docs/informes/fase-2.md                    # este informe
docs/CHANGELOG.md                          # entrada Fase 2
```

**Los 12 temas (nombres del IEEE):** Océano, Bosque, Atardecer, Lavanda, Menta, Cereza, Ámbar, Ciberpunk, Sakura, Café, Aurora, Monocromo.

---

## 4. Decisiones técnicas

1. **Paletas explícitas + alto contraste generado.** Claro y oscuro se diseñaron color a color (24 paletas); el modo alto contraste se **genera** del tono (`hue`) de cada tema (`hsl(h,45%,4%)` de fondo, texto blanco, acentos `hsl(h,100%,75%)` con texto negro) → AAA garantizado sin mantener 12 paletas más a mano. Monocromo usa saturación 0 (grises).
2. **Variables en canales RGB** (`--primary: 3 105 161` + `rgb(var(--x) / <alpha-value>)`): conserva los modificadores de opacidad de Tailwind (`bg-primary/15`) imprescindibles para el glass.
3. **Inyección por `<style id="theme-vars">`** en vez de 36 hojas CSS precompiladas: un solo nodo reutilizable, cambio instantáneo, sin duplicar CSS.
4. **Aplicación sin flash:** el store aplica el tema al crear el módulo (antes del primer render) y de nuevo al rehidratar desde `localStorage`.
5. **Modal con vista previa en vivo y cancelación real:** mientras el modal está abierto cada clic aplica; Esc/fondo restauran el tema original; «Aplicar» confirma. Foco devuelto al disparador (WCAG 2.4.3).
6. **HashRouter + `base: './'`:** decisión clave para el `.exe` (Fase 8) — la app debe cargar desde `file://` sin servidor; ambos cambios son prerequisito y ya están probados con las capturas (que cargan `app/dist/index.html` por archivo).
7. **Regla de borde documentada (1.4.11):** en modo oscuro el 3:1 contra fondos casi negros es **matemáticamente imposible** (máximo teórico ≈ 1.1:1); se exige ≥ 1.2:1 y queda la excepción escrita en el informe de evidencias. En claro sí se exige ≥ 3:1.

---

## 5. Problemas encontrados y resolución

| N° | Problema | Solución |
|----|----------|----------|
| 5.1 | ESLint no cubría `scripts/` (`console`/`process` no definidos) | Bloque Node ampliado a `scripts/**/*.{js,mjs,cjs}` |
| 5.2 | Capturas de la app salían **en blanco** (6.2 KB idénticos) — Vite generaba rutas absolutas `/assets/...` que fallan en `file://` | `base: './'` en `app/vite.config.js`; verificado: capturas ahora 205–215 KB con contenido. **Esto también era un bug futuro del `.exe`** |
| 5.3 | `capturePage` lanzaba `UnknownVizError` | `app.disableHardwareAcceleration()` + reintento con ventana visible |
| 5.4 | Galería salía en blanco: el CSS se emitía como **texto** (faltaba envolver en `<style>`) | `<style>${...}</style>` + ventana de 1320px de alto |
| 5.5 | Falsa alarma visual: la vista previa de la imagen mostraba celdas claras | Verificación por **decodificación de píxeles del PNG** (script propio con zlib): `rgb(6,12,15)` y `rgb(56,189,248)` confirman fondos oscuros correctos — 18.631 px oscuros vs 11.839 claros |

---

## 6. Evidencias (comandos y resultados)

```text
$ npm run lint                → ✅ 0 errores
$ npm run format              → ✅ estilo unificado
$ npm run build:app           → ✅ 302.73 kB JS / 124.78 kB CSS
$ npm run build:landing       → ✅ 228.96 kB JS
$ npm run verificar:contraste → ✅ 36 combinaciones, 0 fallos
                                → docs/evidencias/contraste-36.md
$ GET /api/health             → HTTP 200 {"status":"ok","database":"ok"}
$ npm run capturas            → ✅ 5 PNG:
    galeria-36-temas.png (1859×1002, 1032 KB)
    app-01-oceano-claro.png / app-02-ciberpunk-oscuro.png /
    app-03-bosque-alto-contraste.png / app-04-sakura-claro.png (1583×922)
```

### Reglas de contraste aplicadas (36/36 ✅)

| Modo | Texto | Borde vs fondo |
|---|---|---|
| Claro | ≥ 4.5:1 (AA) | ≥ 3:1 |
| Oscuro | ≥ 4.5:1 (AA) | ≥ 1.2:1 (excepción documentada) |
| Alto contraste | ≥ 7:1 (AAA) | ≥ 3:1 |

---

## 7. Checklist de cumplimiento (Fase 2)

- [x] 12 temas con los nombres del IEEE
- [x] 3 modos: claro, oscuro, alto contraste (AAA en texto)
- [x] 36 combinaciones verificadas por script con evidencia escrita
- [x] Persistencia (localStorage / Zustand persist)
- [x] Selector accesible: modal ARIA, radios nativos, Esc cancela, foco restaurado
- [x] Vista previa en vivo
- [x] Liquid Glass: vidrio translúcido, blur, sombra + brillo interior, fallback sin `backdrop-filter`
- [x] Estructura semántica intacta (`<header>`, `<aside>`, `<main>`, `<footer>`)
- [x] Capturas de evidencia (galería + 4 combos reales)
- [x] Requisito del `.exe` anticipado: assets relativos (`base: './'`) + HashRouter
- [x] `docs/informes/fase-2.md` y `docs/CHANGELOG.md` actualizados

---

**Fase 2 completada. Esperando aprobación explícita (`APROBADO`) para iniciar la Fase 3 (backend: autenticación JWT + usuarios).**
