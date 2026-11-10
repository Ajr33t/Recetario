# CHANGELOG — SazónLab (Recetario Inteligente)

Registro de cambios por fase. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/).

---

## [Fase 0] — 09/11/2026 — Descubrimiento y definición

### Agregado
- `docs/IEEE_Recetario_Inteligente.md`: copia íntegra del documento IEEE fuente (2.207 líneas, SHA256 verificado).
- `docs/informes/fase-0.md`: informe de la Fase 0 con stack confirmado, estructura de carpetas, alcance del MVP, decisiones técnicas y riesgos.
- `docs/CHANGELOG.md`: este archivo.

### Decisiones clave (Fase 0)
- Monorepo con npm workspaces: `app/`, `server/`, `desktop/`, `landing/`.
- Estado con Zustand (persist middleware).
- BD: SQLite por defecto (demo cero-config) + PostgreSQL opcional vía `DATABASE_URL`.
- IA generativa (OpenAI/Gemini) como fuente opcional por API key, con fallback permanente a TheMealDB (mitiga hallazgo 10.5 del IEEE).

---

## [Fase 1] — 09/11/2026 — Setup del proyecto

### Agregado
- Monorepo con npm workspaces: `app/`, `server/`, `desktop/`, `landing/`.
- Raíz: `package.json` (scripts globales), `eslint.config.mjs` (flat config), `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.editorconfig`, `README.md` base.
- **app/**: React 19 + Vite 7 + Tailwind 3 + Zustand + React Router 7 + Font Awesome 6 + SweetAlert2; estructura semántica completa (`SkipLink`, `<header>` con buscador global, `<aside>` con nav ARIA y menú móvil, `<main>` con 7 rutas, `<footer>` con versión); páginas Home, Buscar, RecetaDetalle, MisRecetas, Favoritos, Ajustes, Login; `services/api.js` (cliente HTTP); `store/themeStore.js` (persist localStorage).
- **server/**: Express 4 + better-sqlite3 (esquema de 10 tablas idempotente según el modelo de dominio IEEE) + JWT + bcryptjs + ruta `/api/health` + middleware de errores.
- **desktop/**: Electron 44 (contextIsolation + sandbox + IPC `app:info`) + electron-builder 26 con target NSIS.
- **landing/**: React + Vite (puerto 5174) con hero, features, descarga `.exe` y SEO básico.
- Tokens de color en formato **canal RGB** (soporte de opacidad para glass).

### Resuelto
- Falsos positivos de ESLint en JSX → `eslint-plugin-react` + `react/jsx-uses-vars`.
- `bg-primary/15` inexistente → colores Tailwind vía `rgb(var(--x) / <alpha-value>)`.
- npm 11 bloquea scripts de instalación nativos → verificado que todo funciona sin ellos (mejor decisión: no aprobar `node-gyp rebuild`).

### Decisión del cliente registrada
- El `.exe` debe incluir **SQLite local + todos los assets compilados (CSS/JS)** en el instalador (Fase 8).

---

## [Fase 2] — 10/11/2026 — Sistema de temas (12 × 3) + Liquid Glass

### Agregado
- `app/src/themes/palettes.js`: 12 temas (Océano, Bosque, Atardecer, Lavanda, Menta, Cereza, Ámbar, Ciberpunk, Sakura, Café, Aurora, Monocromo) con paletas claro/oscuro explícitas + generador de modo alto contraste (AAA) por tono.
- `app/src/themes/engine.js`: `applyTheme()` inyecta variables CSS en canales RGB vía `<style id="theme-vars">` y marca `data-theme`/`data-mode` en `<html>`.
- `ThemeSelector`: modal ARIA con vista previa en vivo, cancelación (Esc/fondo) que restaura, devolución de foco; acceso desde cabecera y Ajustes.
- `themeStore` sin parpadeo: aplica al crear el módulo y al rehidratar; 3 modos (claro/oscuro/alto-contraste) con persistencia.
- `scripts/verificar-contraste.mjs` → `docs/evidencias/contraste-36.md` (**36/36 combinaciones cumplen WCAG**: AA 4.5, AAA 7 en alto contraste, borde UI 3 en claro).
- `scripts/capturas.cjs` (Electron) → `docs/evidencias/galeria-36-temas.png` + 4 capturas reales de la app.
- Liquid Glass refinado: brillo interior `inset`, bordes de 2px en alto contraste, foco amarillo AAA.
- Scripts npm: `verificar:contraste`, `capturas`.

### Cambiado
- `main.jsx`: `BrowserRouter` → **`HashRouter`** (compatibilidad `file://` para Electron).
- `AppHeader`: toggle de 2 modos → botón selector + toggle de 3 modos.
- `Ajustes`: 2 radios de modo → 3 modos + selector completo + indicador AA/AAA.
- ESLint: bloque Node ampliado a `scripts/**/*`.

### Resuelto
- Capturas de la app en blanco → Vite usaba rutas absolutas; **`base: './'`** (requisito también para el `.exe`, Fase 8).
- `UnknownVizError` en `capturePage` → `disableHardwareAcceleration` + reintento visible.
- Galería en blanco → CSS emitido como texto, faltaba envolver en `<style>`.
- Falsa alarma visual de la galería → verificación por decodificación de píxeles PNG (colores exactos confirmados).

---

*(Las fases siguientes se agregarán aquí conforme se completen.)*
