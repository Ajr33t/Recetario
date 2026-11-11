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
- **(revisión 10/11)** Temas/alto-contraste no aplicaban en DEV → selector `html[data-theme][data-mode]` (gana por especificidad sin importar el orden de inyección) + import de CSS antes que `App`; verificado con `npm run verificar:temas` (4/4 ✓).
- **(revisión 10/11)** Glass sin estilo iPhone → `.glass` con brillo especular en degradado, refracción inset en 4 bordes y `blur(24px) saturate(1.8)` (app + landing).
- **(revisión 2)** `merge` de Zustand recibía el envoltorio `{state, version}` en vez del estado plano → temas persistidos no se aplicaban; corregido y verificado 4/4 (`verificar:temas`).
- **(revisión 2)** Pie con letrero «hecho con 💎 Liquid Glass» → texto legal limpio.
- **(revisión 2)** Enlace «Accesibilidad» del pie no llevaba a ningún sitio → navega a `/ajustes` + scroll a la sección Accesibilidad.

### Cambiado (revisión 2)
- **Alto contraste ahora es un interruptor INDEPENDIENTE** del modo claro/oscuro (prevalece sobre él) — en Ajustes, en el selector de temas y en el toggle rápido de la cabecera (si HC está activo, el primer clic lo desactiva).
- **Panel de accesibilidad completo en Ajustes (RF-14):** tamaño de fuente (normal 16 / grande 18 / extra 20), tipografía para dislexia (Verdana/Trebuchet + espaciado y altura de línea amplios), reducir movimiento y subrayar enlaces — todo persistido en `sazonlab-preferencias` con migración automática del formato antiguo.
- Footer: eliminado el letrero «Liquid Glass».

### Nuevos scripts
- `npm run verificar:temas` → valida en el dev server que los temas se aplican (computed style).
- `npm run capturas` → galería + capturas de la app con Electron.

### Pendientes registrados (para fases posteriores)
- **Exportar recetas del usuario a PDF como libro de cocina** (solicitado por el cliente — candidato a Fase 5/7).
- **Páginas legales reales de Privacidad y Términos** para que los enlaces del pie lleven a contenido legal completo (candidato a Fase 7).

---

## [Fase 3] — 10/11/2026 — Autenticación JWT + usuarios + recetas en la nube

### Agregado
- **Backend auth**: `POST /api/auth/registro` (bcrypt 10 rondas, correo único), `POST /api/auth/login` (JWT 7 días, mensajes genéricos), `GET /api/auth/me`, middleware `requireAuth`.
- **Recetas por usuario**: `GET/POST/PUT/DELETE /api/recipes` protegidas — crear con ingredientes/pasos, editar con snapshot de versión, borrar suave (papelera), auditoría. **Recetas en el servidor = visibles desde cualquier dispositivo.**
- **Recuperación de contraseña**: código de 6 dígitos al correo (SHA-256, TTL 15 min, 5 intentos) + `services/mailer.js` con envío real opcional (Resend vía `RESEND_API_KEY`) y **modo demo** que muestra el código en pantalla.
- **Perfil personalizable** (`/perfil`): foto de perfil con recorte 256px en el navegador (canvas, sin librerías), 12 avatar-iconos, nombre, bio (200), **color de acento** (presets + selector), estadísticas (nº recetas, miembro desde), cambio de contraseña, cerrar sesión. `PUT /api/auth/perfil` + `POST /api/auth/cambiar-contrasena`.
- **Menús por sesión** (decisión del cliente): lateral = Inicio/Ajustes/Iniciar sesión para invitados; con sesión se desbloquean Buscar, Mis recetas, Favoritos, **Mi perfil** (solo en el menú lateral, no en el navbar).
- **Inicio con contenido**: sección «¿Cómo funciona?» (3 pasos), invitación a cuenta para invitados (nube/multi-dispositivo/seguridad).
- `authStore` (Zustand) + API con `Bearer` automático y logout en 401.
- `scripts/verificar-auth.mjs` → `npm run verificar:auth` (**27/27**).
- Tabla `password_reset` + columnas `users.avatar/bio/avatar_imagen/color_perfil` con migración `ALTER` tolerante a BD existentes.

### Cambiado
- `Login.jsx`: 3 modos reales (entrar / crear cuenta / olvidé mi contraseña en 2 pasos).
- `MisRecetas.jsx`: lista real desde el servidor (antes maqueta) + estado de invitado.
- `AppFooter.jsx`: sin letrero «Liquid Glass»; «Accesibilidad» navega al menú de accesibilidad.
- `AppHeader.jsx`: menú de cuenta con nombre (salir); «Mi perfil» removido del navbar por decisión del cliente.

### Resuelto
- `text-destructive` inexistente → token real `danger`.
- Navegación durante render en Perfil sin sesión → `<Navigate replace />`.
- Columnas de perfil ausentes en BD antigua → `migrarEsquema()` con PRAGMA + ALTER.

---

## [Fase 4] — 10/11/2026 — Búsqueda con TheMealDB + sugerencias con IA

### Agregado
- **Cliente TheMealDB** (`services/mealdb.js`): caché 10 min, normalización completa (ingredientes, medidas, instrucciones, etiquetas, video, fuente), búsqueda por nombre, detalle, aleatorias, filtros, explorar y autocompletado.
- **Fix**: el filtro multi-ingrediente oficial (`filter.php?i=a,b`) devuelve vacío → consulta por ingrediente + **fusión por frecuencia** (orden por `coincidencias`, tope 12).
- **Sugerencias con IA** (`services/ia.js`): OpenAI `gpt-4o-mini` → Gemini `gemini-1.5-flash` → sin claves responde igual (`fuente:"ninguna"`). La IA solo aporta la "idea del chef"; **las recetas siempre salen de TheMealDB**.
- **Todo siempre en español** (requisito del cliente): `services/diccionario.js` (diccionario culinario EN→ES local, ~250 términos) + `services/traductor.js` (diccionario → **caché permanente en SQLite** `traducciones` → Google translate sin clave → MyMemory con troceado ≤450 chars). Se traducen títulos, categorías, áreas, ingredientes con medidas e instrucciones; **el usuario busca en español** ("pollo, tomate") y la consulta se traduce a inglés para TheMealDB (con traducción inversa para lo traducido en línea).
- **8 endpoints** en `/api/search`: nombre, ingredientes, sugerencias, filtros, categorías/áreas, destacadas, autocompletado e historial (solo con JWT).
- **Autocompletado accesible** (`CampoAutocomplete.jsx`): ARIA combobox, debounce 250 ms, ↑↓/Enter/Escape; ingredientes → chip (admite parcial en español: "pol" → "Pollo"), recetas → abre el detalle.
- `scripts/verificar-busqueda.mjs` → `npm run verificar:busqueda` (**41/41**, 8 de ellos de la capa en español).

### Cambiado
- `Buscar.jsx`: 3 modos conectados (ingredientes/nombre/explorar), banner "Idea del chef", chips con coincidencias, estados vacío/error.
- `RecetaDetalle.jsx`: detalle real (imagen, categoría/área/etiquetas, ingredientes con medidas, pasos numerados, video/fuente, 404).
- `Home.jsx`: "Recetas destacadas" reales desde `/search/destacadas` (respaldo estático si falla).

---

## [Fase 5] — 10/11/2026 — CRUD de recetas en UI + favoritos + papelera + versiones + compartir + libro de cocina

### Agregado
- **Backend ampliado**:
  - `opcionalAuth` en `middleware/auth.js` → `GET /api/recipes/:id` funciona para invitados (recetas públicas) y con sesión (las propias + indicador `favorito`).
  - Migración `recipes.externo_id` + índice → recetas de TheMealDB guardadas como favoritas se **importan a la colección del usuario** (`origen='sugerida'`), sin duplicados por usuario.
  - Versiones con **snapshot completo** (`{receta, ingredientes, pasos}`): `GET /:id/versiones`, `POST /:id/versiones/:v/restaurar` (antes de restaurar guarda el estado actual como versión nueva).
  - Papelera: `GET /recipes?estado=papelera`, `POST /:id/restaurar`, `DELETE /:id?permanente=1` (borrado definitivo), columna `deleted_at` en la lista.
  - Exportar/importar JSON (RF-21): `GET /recipes/exportar` (formato `sazonlab.recetas` v1 con ingredientes y pasos) y `POST /recipes/importar` (valida hasta 500, informa errores por receta).
  - **Nuevo router `/api/favorites`**: listar favoritas, alternar por id, `POST /externa` (importa de TheMealDB y marca favorita), `GET /estado?externo_id=`.
- **Frontend**:
  - `RecetaForm.jsx`: crear/editar recetas con ingredientes y pasos dinámicos, etiquetas (máx. 10), subida de foto con redimensionado en canvas (sin librerías), visibilidad privada/pública (RF-12), SweetAlert2 para eliminar, **panel de historial de versiones con «Restaurar»**.
  - `MisRecetas.jsx`: acciones Ver/Editar/Eliminar (confirmación SweetAlert2), enlace a Papelera, **Exportar/Importar JSON**, modo selección → «Generar libro de cocina».
  - `Favoritos.jsx`: lista real (propias + guardadas de TheMealDB), quitar, estados invitado/cargando/vacío.
  - `Papelera.jsx`: restaurar y **borrado permanente con casilla de confirmación** (SweetAlert2).
  - `RecetaDetalle.jsx`: unificado (propia/pública/externa), **corazón de favorito** (invitado → prompt de login), **diálogo de compartir** (copiar enlace / copiar receta como texto / «Publicar y copiar»), Editar/Eliminar si es tuya, **aviso de ingredientes faltantes** según la última búsqueda con marcado en rojo, chip «Traducido al español».
  - **`LibroCocina.jsx`** (idea del cliente): portada + índice + una receta por página; botón «Imprimir / Guardar como PDF» con `window.print()` (sin dependencias: el PDF lo genera el navegador).
  - Rutas nuevas: `/recetas/nueva`, `/recetas/:id/editar`, `/papelera`, `/libro`; CTA «Crear receta» del Home apunta al formulario.
  - `Buscar.jsx` guarda los ingredientes de la última búsqueda en `sessionStorage['sazonlab:ingredientes']` (lo consume el detalle).
- `scripts/verificar-recetas.mjs` → `npm run verificar:recetas` (**39/39**: CRUD, detalle público/privado, versiones, papelera, export/import, favoritos propios y externos, casos de error).
- **Ajustes de la tanda de cambios del cliente (misma fase)**:
  - **Compartir con imagen y PDF**: `services/exportarReceta.js` genera la receta como **imagen PNG** (canvas) y ofrece **Exportar a PDF** además de copiar enlace/texto (SweetAlert2 con 4 opciones).
  - **JSON a Ajustes → Datos**: exportar/importar JSON (RF-21) se movió de «Mis recetas» a Ajustes (con sesión); en «Mis recetas» queda solo el libro.
  - **Libro de cocina mejorado**: portada decorativa, botón «Descargar libro en PDF», **índice con nombre + puntos guía + número de página** (medido contra la altura imprimible A4) y **página fija de «Medidas y equivalencias»** (volumen/peso/temperatura, español ↔ inglés, 20 filas).
  - **Fix «Explorar»**: nuevo `server/src/services/coberturaAreas.js` — sondeo secuencial (300 ms + confirmación de ceros) de las 195 áreas de TheMealDB cacheado 30 días en SQLite (`cobertura_areas`); `/search/filtros` devuelve **solo las 29 áreas con recetas** (antes 195 y casi todas vacías); sondeo en background al arrancar. `Buscar.jsx` carga filtros al entrar en Explorar con estado de carga, error + reintentar y deduplicación (claves React duplicadas eliminadas).
  - **Checklist de ingredientes** en el detalle: casillas con tachado, chip «x/n listos», «Vaciar checklist», persistencia en `localStorage['sazonlab:checklist:<id>']`.
  - **Página `/medidas`** (nueva ruta + enlace al pie + enlace desde el detalle): conversor de volumen/peso/temperatura (cantidad, De, A, invertir, `aria-live`) + 3 tablas de equivalencias es/en con valores fijos; módulo compartido `app/src/data/medidas.js` (también alimenta la página fija del libro).
  - **Fix campos en modo claro**: `.field` pasa de `--glass` translúcido (se fundía con el panel blanco) a relleno sólido `rgb(var(--muted) / 0.85)` + sombra interior, hover/foco con `--primary` — token-based, vale para los 12 temas × 3 modos.
- `scripts/verificar-ui-f5.cjs` → `npm run verificar:ui-f5` (**37/37**: JSON fuera de «Mis recetas»/dentro de Ajustes, portada/índice con página/PDF/medidas del libro, compartir imagen+PDF, checklist con persistencia, Explorar 29 áreas sin duplicados + resultados, conversor 2 tazas = 473,176 ml).
- `scripts/verificar-busqueda.mjs` ampliado a **68/68**: comprueba que **cada área ofrecida en `/filtros` devuelve recetas reales**.

### Cambiado
- `styles/index.css`: bloque `@media print` (oculta `.no-print`, header/aside/footer, fondo blanco y texto negro, sin blur, saltos de página) + estilos `.libro-*` para pantalla e impresión.
- `AppHeader/AppSidebar/AppFooter/SkipLink`: clase `no-print`.
- `RecetaDetalle`: unifica propias y externas (antes solo externas de la Fase 4).

### Resuelto
- Token `warning` inexistente en Tailwind → aviso de ingredientes faltantes usa `danger` (coherente con el marcado rojo).
- Sombreamiento `falta`/`faltaIng` en `RecetaDetalle` → función única `falta()`.
- **«Explorar no funciona» (cliente)**: TheMealDB lista 195 áreas pero solo ~29 tienen recetas (y el rate-limit devolvía ceros falsos bajo concurrencia) → cobertura sondeada secuencialmente y cacheada; el filtro solo ofrece áreas que devuelven resultados.
- **Campos poco visibles en modo claro (cliente)**: `.field` con fondo glass blanco sobre panel glass blanco → relleno sólido por token `--muted` + sombra interior.

---

*(Las fases siguientes se agregarán aquí conforme se completen.)*
