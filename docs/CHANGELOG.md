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

### 2.ª tanda de cambios del cliente (misma Fase 5)

### Cambiado
- **Checklist ↔ faltantes**: marcar un ingrediente en el checklist («lo tengo») lo saca del aviso «Te faltan X de Y» y del marcado en rojo — antes eran estados independientes y el aviso nunca cambiaba.
- **Avisos informativos ⓘ retirados**: «Marcados en rojo…» (detalle), «Valores fijos de referencia…» (/medidas) y panel «Consejo» (formulario).
- `RecetaForm`: el panel lateral (historial de versiones) solo se muestra al editar; al crear, una sola columna.
- `AppHeader`: el chevron del perfil **gira** (rotate-180 con transición) al abrir/cerrar el menú.
- `.field` vuelve a translúcido `rgb(var(--muted) / 0.65)` + sombra interior: visible en modo claro y con más Liquid Glass (petición del cliente).
- **Tema glass para SweetAlert2**: popup con gradiente glass `--card/0.88` + blur, inputs y botones tematizados (confirmar `--primary`, cancelar `--card`) mediante selectores prefijados `html .swal2-container …` — más específicos que los `:where()` de SweetAlert2 sin usar `!important`.
- Compartir: aviso de receta privada con token `danger` (antes color inline) y `focusCancel` (SweetAlert2 ignora `focusCancelButton`).

### Corregido
- **PDF en blanco al compartir**: `imprimirReceta` ahora es `async` — espera la foto de la comida (máx. 4 s) antes de `window.print()` y limpia la vista solo en `afterprint` (respaldo a 5 min); en Electron `print()` no bloquea el hilo y el respaldo de 1,5 s borraba la receta antes de tiempo.
- **Descarga PNG**: el ancla ya no se retira en el mismo tick (se limpia a los 15 s) y el blob se revoca a los 30 s — en Electron eso interrumpía la descarga.

### Hallazgo de entorno (no es bug de la app)
- En **esta máquina**, Electron 44.10.2 interrumpe **toda** descarga (`done: interrupted`) con cualquier origen (blob/`data:`/http, con y sin `setSavePath`, en Temp/OneDrive/Downloads) — reproducible con un `BrowserWindow` de stock sin código de la app; disco con 398 GB libres. El PNG se genera correctamente (contenido verificado: estilos + foto de la comida) y la descarga funciona en navegadores normales (Chrome/Edge). Evidencia en `docs/informes/fase-5.md` §5.

---

## [Fase 6] — 11/11/2026 — Accesibilidad WCAG 2.1 AA + notificaciones, pop-ups y onboarding (Sprints 7–8)

### Agregado
- **Servicio de notificaciones propio** (`app/src/services/toast.js`): cola de toasts + historial de 20 con estado no leído, sin dependencias y testeable en Node (`exito`/`fracaso`/`informar`, `tiempoRelativo` en español).
- **`ToastHost.jsx`**: toasts glass con tokens del tema, región `aria-live` **siempre montada**, `role="status"` (polite) / `role="alert"` (errores, WCAG 4.1.3) y cierre manual etiquetado.
- **`Modal.jsx`** (RF-16): modal glass propio reutilizable — portal, trampa de foco, Esc, devolución de foco al disparador, `aria-modal` + `aria-labelledby`, backdrop configurable.
- **Tour de bienvenida** (`Onboarding.jsx`, RF-25/CU-25/47/48): 6 pasos con anillo *spotlight* sobre elementos reales (`[data-tour]`), «Paso X de 6» con `aria-current`, «Omitir» siempre visible, persistencia en localStorage (una sola vez) y **«Repetir tour» desde Ajustes → Accesibilidad**.
- **Campana de notificaciones** en la cabecera (antes botón deshabilitado): badge de no leídas, panel con historial y tiempo relativo en español, estado vacío, «Vaciar», Esc cierra y devuelve el foco.
- **Pruebas unitarias** con el runner nativo de Node (`npm test` → `node --test app/src`, cero dependencias): 18 tests (toast, medidas, `escaparHtml`).
- **Batería de accesibilidad** `npm run verificar:a11y` (`scripts/verificar-a11y.cjs`): axe-core (etiquetas WCAG 2.0/2.1 A+AA) sobre **11 estados** (7 páginas + tour + selector de tema + panel de notificaciones + diálogo de compartir); informe en `docs/evidencias/a11y-axe.md`; falla ante cualquier violación `serious`/`critical`.
- **Checklist manual WCAG 2.1 AA** (`docs/evidencias/checklist-wcag-21-aa.md`): 28 criterios + guion de teclado y NVDA.
- **Suite UI** `npm run verificar:ui-f6` (`scripts/verificar-ui-f6.cjs`, 29 checks): tour (apertura, progreso, spotlight, omitir/persistencia, repetir), campana (aria-expanded, Esc+foco, vacío) y toasts (aviso real al marcar favorito, historial, cierre manual).

### Cambiado
- **Los 11 toasts de SweetAlert2 pasan al sistema propio** (`exito`/`informar`): SweetAlert2 queda para diálogos, confirmaciones y alertas (requisito del cliente) con su tema glass de la Fase 5.
- `AppHeader`: campana habilitada con panel accesible; buscador/tema/campana marcados `data-tour` como objetivos del tour.
- Ajustes → Accesibilidad: botón «Repetir tour de bienvenida».

### Resuelto
- **axe `aria-prohibited-attr`**: contenedor de toasts con `aria-label` sin rol → `role="region"`; iconos `<i aria-label>` (check «Activado/Seleccionado») → `role="img"`.
- **axe `label-content-name-mismatch`**: las tarjetas del Home llevaban `aria-label` que ocultaba el texto visible → se elimina (el texto visible pasa a ser el nombre accesible).
- **axe `label`**: input del enlace en el diálogo de compartir sin etiqueta → `aria-label`.
- **axe `aria-required-children`**: contenedor de acciones del detalle con `role="list"` sin hijos `listitem` → `role="group"`.

---

## [Fase 7] — 11/11/2026 — Landing page oficial + páginas legales (Sprint 10)

### Agregado
- **Landing completa** (`landing/src/App.jsx`): hero con **captura real** de la app (`landing/public/captura-app.png`) dentro de un marco tipo navegador, sección **«¿Cómo funciona?»** (3 pasos), 6 funciones, descarga y pie con enlaces vivos — cero `href="#"`.
- **Enlaces reales**: demo → `http://localhost:5173/`, descarga → `./SazónLab-Setup-1.0.0.exe` (artefacto que copiará la Fase 8).
- **Vistas legales en la landing** por hash (`#/privacidad`, `#/terminos`), sin react-router, con el mismo texto que la app.
- **Páginas legales en la app**: `app/src/pages/Legal.jsx` con rutas `/privacidad` y `/terminos`.
- **SEO**: `landing/public/robots.txt` + JSON-LD (`SoftwareApplication`, `inLanguage: es`) + Open Graph + Twitter Card + canonical en `landing/index.html`.
- **Normativa colombiana completa** en un módulo compartido **`legal/contenido-legal.jsx`** (fuente única consumida por app y landing; globs de Tailwind/ESLint ampliados): Constitución arts. 15/20/86 + T-625 de 2015, Ley 1581 de 2012 (+ Decreto 1377 de 2013 y Decreto 1074 de 2015), Ley 1266 de 2009, Ley 1480 de 2011 modificada por la Ley 2439 de 2024 (retracto), Ley 527 de 1999, Ley 1712 de 2014, Ley 1755 de 2015 (15 días hábiles), Ley 1273 de 2009 y Ley 23 de 1982, con la **SIC** como autoridad de control y PQRSD vía `soporte@sazonlab.test`.
- **Eliminación de cuenta con código de confirmación al correo**: `POST /auth/solicitar-eliminacion` + `POST /auth/eliminar-cuenta` (código de 6 dígitos, SHA-256, TTL 15 min, máx. 5 intentos, modo demo devuelve el código, auditoría `eliminar_cuenta`); **«Zona de peligro»** en Mi perfil con flujo SweetAlert2 de 3 pasos (advertencia → código → borrado) + toast + cierre de sesión; migración `password_reset.proposito` (`recuperacion`/`eliminacion`) y borrado explícito de recetas propias (el resto en cascada).
- **Logo de la app**: `assets/logo.svg` (chef hat glassy con destellos), favicons SVG en app y landing, imagen en las cabeceras, script `npm run logo` (rasteriza 512×512 con Electron, sin dependencias nuevas) e icono `desktop/build/icon.png` aplicado al instalador NSIS (`win.icon`).
- **Suite** `npm run verificar:cuenta` (`scripts/verificar-cuenta.cjs`, **27 checks**: API + flujo UI + axe en `/perfil`) con captura `app-06-zona-peligro.png`; `verificar:landing` ampliada a **38 checks** (aserciones de leyes colombianas en ambas superficies).

### Cambiado
- **Pie de la app**: «Términos» y «Privacidad» dejan de ser enlaces muertos (`<a href="#">`) y navegan con botón + `navigate()` (patrón HashRouter ya usado en Medidas).
- Landing: `--primary` de `2 132 199` a `3 105 161` (sky-700) — el anterior daba 4.1:1 con texto blanco (axe `serious` en `.btn-primary`).
- CSS de la landing: nueva clase `.surface-section` (usada por las páginas legales).
- Cabeceras (app y landing): el cuadrado con icono de tenedor pasa a usar el **logo SVG**.
- `AppHeader`: `aria-label` del botón «Ingresar» corregido a *«Ingresar: iniciar sesión o ver perfil»* — el texto visible no estaba en el nombre accesible (axe `label-content-name-mismatch`, gate de `verificar:a11y`).
- `desktop/package.json`: `electron` fijado a `44.10.2` exacto (electron-builder exige versión fija) + `win.icon`.

### Resuelto
- **Pendiente de la Fase 5** — enlaces legales del pie que no llevaban a ninguna parte.
- **axe `color-contrast` en la landing** (3 nodos): contraste AA insuficiente del primario en los botones.
- **`.exe` generado con icono propio** y copiado a `landing/public/SazónLab-Setup-1.0.0.exe` (114.9 MB) — el enlace de descarga de la landing ya funciona (el binario no se versiona por el límite de 100 MB de GitHub: se regenera con `npm run build:exe`).

---

## [Fase 8] — 11/11/2026 — Electron + `.exe` NSIS + modo offline SQLite (Sprint 10)

### Agregado
- **API embebida en el `.exe`**: `desktop/main.js` hace `fork` de `server/src/index.js` con `ELECTRON_RUN_AS_NODE=1`, puerto fijo **4731** (`SAZONLAB_PORT` para cambiarlo; el dev server sigue en 3001), espera activa de `/api/health` (máx. 10 s) antes de mostrar la UI y cierre del hijo en `will-quit`/`exit` (sin procesos huérfanos).
- **SQLite local en el `.exe`**: `SAZONLAB_DATA_DIR` (nuevo en `server/src/db/database.js`) redirige la BD a `app.getPath('userData')` → `%APPDATA%\SazonLab\sazonlab.db` (fuera de `Program Files`; `productName: SazonLab` top-level la hace determinista).
- **Descubrimiento de API en `file://`**: `app/src/services/api.js` arma `http://127.0.0.1:{puerto}/api` cuando la página corre desde archivo (el puerto llega como query param `?apiPort=4731` en `loadFile`); `VITE_API_URL` sigue teniendo prioridad y en web/`http` nada cambia.
- **Empaquetado completo**: `desktop/package.json` con dependencias de runtime del server (bcryptjs, better-sqlite3, cors, dotenv, express, jsonwebtoken), `files` = `main.js` + `preload.js` + `build/icon.png` + `renderer/**` + `server/**`, `asarUnpack` de `server/**/*` y `**/node_modules/**` (el hijo nunca lee el asar: `dlopen` de `.node` y resolución de `express` funcionan desde rutas reales).
- **Pipeline de build**: `npm run sincronizar:desktop` (`scripts/sincronizar-desktop.cjs`) copia `app/dist → desktop/renderer` y `server/src + server/package.json → desktop/server` (el `package.json` declara `type: module`); `build:exe` = `build:app && sincronizar:desktop && dist`.
- **Suite** `npm run verificar:desktop` (`scripts/verificar-desktop.mjs`, **23 checks**): estático (asar con UI+API+assets, desempaquetado de express/better-sqlite3/prebuild win32-x64) + dinámico (lanza `SazonLab.exe --remote-debugging-port`, health 4731 `database:ok`, React montado en `#root` vía CDP/WebSocket, `file:` + `apiPort=4731`, flujo registro→receta→listar→favorito sobre la BD local, puerto liberado al cerrar y `%APPDATA%\SazonLab\sazonlab.db` creada en la corrida).

### Cambiado
- `desktop/package.json`: **`npmRebuild: false`** — `@electron/rebuild` intentaba compilar `better-sqlite3` con node-gyp y la máquina no tiene Python; el prebuild oficial ya carga en Electron 44 (test `ABI-OK` con `ELECTRON_RUN_AS_NODE`), así que se empaqueta tal cual.
- `.exe` regenerado con el bundle offline completo: **124.7 MB** (antes 114.9 sin server ni SQLite) y copiado a `landing/public/SazónLab-Setup-1.0.0.exe`.
- `eslint.config.mjs` / `.prettierignore`: ignoran `desktop/server/**` (copia generada de `server/src`, ya lintada en origen) — sin esto el lint daba 37 falsos positivos tras sincronizar.
- `.gitignore`: también `desktop/server/` (artefacto generado).

### Resuelto
- **Requisito del cliente de la Fase 1**: el `.exe` incluye **SQLite local (modo offline) + todos los assets compilados** (CSS, Font Awesome, SweetAlert2, JS) dentro del instalador — verificado por `verificar:desktop` sobre el binario real.
- **El `.exe` anterior no tenía UI**: `desktop/renderer` no existía (build sin sincronizar) y la API no estaba embebida; ahora el instalador es autosuficiente.

---

## [Fase 9] — 11/11/2026 — Pruebas finales, corrección de hallazgos e INFORME_FINAL (Sprint 11 · Hito 12)

### Agregado
- **RF-22 — Panel de administración**: `server/src/routes/admin.js` (`GET/POST/PATCH /api/admin/usuarios`) con middleware `requireRole('admin')` + re-validación del rol/estado en la BD por petición (defensa contra JWT antiguos), protección de la propia cuenta (no auto-degradarse/desactivarse → siempre queda ≥ 1 admin) y auditoría de cada operación. Seed `asegurarAdmin()` en `initDatabase()`: `admin@sazonlab.test` / `SazonLab-Admin-2026` (sobrecribible con `ADMIN_CORREO`/`ADMIN_PASSWORD`).
- **RF-22 — UI**: `app/src/pages/Admin.jsx` (ruta `/admin`) con creación de cuentas y tabla de usuarios (rol con SweetAlert2, inactivar/activar explicando la revocación inmediata); ítem «Administración» en el sidebar solo para `rol === 'admin'`; vista de acceso denegado para el resto.
- **Revocación inmediata de sesiones**: `requireAuth` revalida `users.estado` en cada petición → desactivar una cuenta invalida sus JWT vigentes (401) y bloquea el login (403).
- **RF-10 — Filtros avanzados**: `filtrarAvanzado()` en `server/src/routes/search.js` (excluidos + dieta vegetariana/vegana sobre el detalle enriquecido, cap 40, aviso `sin_dato`, coste 0 sin parámetros) aplicado a `/search`, `/search/sugerencias` y `/search/categorias`; UI de chips de excluidos + select de dieta en Buscar (re-búsqueda automática) y barra de filtros en Mis recetas (texto, tiempo máximo, dificultad, etiqueta) con recuento transparente y estado vacío.
- **RF-11 — Historial de búsquedas**: `app/src/services/historialBusquedas.js` (localStorage, tope 8, deduplicado) + sección «Búsquedas recientes» en Buscar con repetición en un clic y «Vaciar historial».
- **`docs/INFORME_FINAL.md`**: cumplimiento **25/25 RF**, arquitectura, batería final, manual de usuario, lecciones aprendidas y pendientes.
- **`docs/ACTA_DE_CIERRE.md`**: acta de cierre del proyecto (Hito 12) con la aprobación, los entregables oficiales, el resultado técnico y los pendientes fuera de alcance.
- **`docs/informes/fase-9.md`**: informe de la fase (hallazgos de cumplimiento y su corrección).
- Suites ampliadas: `verificar:auth` **26 → 41 checks** (flujo admin completo), `verificar:ui-f5` **37 → 58 checks** (RF-10, RF-11 y panel `/admin` con axe).

### Cambiado
- `README.md`: secciones de administración, filtros avanzados, historial, cuenta admin de demo y resultados de la batería.
- `server/src/middleware/auth.js`: `requireAuth` pasa a consultar la BD (una fila por petición) y se añade `requireRole(...roles)`.

### Ajustes de cierre (peticiones finales del cliente)
- **«Mi perfil» sale del menú lateral y entra en el menú de cuenta del navbar**: la cabecera abre un desplegable con el avatar del usuario, **Mi perfil**, Mis recetas, Favoritos, Administración (si es admin) y Cerrar sesión; el lateral conserva Inicio, Buscar, Mis recetas, Favoritos y Ajustes.
- **Logo del perfil en el navbar**: el botón de cuenta y la cabecera del menú muestran la **foto del usuario**, o su avatar de Font Awesome sobre su color elegido (o el icono por defecto), en lugar del icono genérico.
- **Instalador `.exe` visible**: la cabecera y el hero de la landing **descargan el `.exe` directamente** (antes solo bajaban al ancla de descarga) y la sección de descarga muestra el nombre y el tamaño del archivo; la demo web muestra un CTA «Descargar para Windows» en el inicio y en el pie (se oculta dentro del propio `.exe`).
- **`.exe` visible dentro de la carpeta**: nuevo script `npm run copiar:exe` (`scripts/copiar-exe.cjs`) que deja el instalador en la **raíz del proyecto** (`SazónLab-Setup-1.0.0.exe`) y en `landing/public/`; `build:exe` ya lo ejecuta al final. Sigue sin versionarse en Git (124,7 MB > límite de 100 MB).

### Resuelto
- **Hallazgos de la revisión de cumplimiento**: RF-02 (parcial), RF-10 (parcial), RF-11 y RF-22 estaban asignados en el plan (fases 3/4) pero sin implementar → cerrados en este Sprint 11 («corrección de hallazgos»).
- **Batería de cierre 100% en verde**: lint/format, 18 unitarias, 11 suites (381 checks), builds de app/landing/exe y endpoints 5173/3001/5174/robots.txt.

---

*(Proyecto cerrado — Fase 9 completa.)*
