# FASE 1 — Setup del proyecto

**Proyecto:** Recetario Inteligente — SazónLab
**Fecha:** 09/11/2026
**Estado:** ✅ Completada — pendiente de aprobación

---

## 1. Objetivo

Inicializar el monorepo con npm workspaces, configurar los cuatro paquetes (`app/`, `server/`, `desktop/`, `landing/`), instalar el tooling de calidad (ESLint + Prettier) y crear la estructura semántica base (`<header>`, `<aside>`, `<main>`, `<footer>`) con estilo Liquid Glass, dejando todo verificado: instalación, lint, format, builds y sonda de salud de la API.

---

## 2. Actividades realizadas

| N° | Actividad | Resultado |
|----|-----------|-----------|
| 2.1 | Verificar entorno: Node **v26.13.0**, npm **11.20.0**, registry npmjs | ✅ |
| 2.2 | Consultar versiones actuales y anteriores estables de 23 paquetes clave + fechas de lanzamiento + peerDependencies | ✅ (matriz en sección 4) |
| 2.3 | Crear raíz del monorepo: `package.json` (workspaces), ESLint flat config, Prettier, `.gitignore`, `.editorconfig`, `README.md` base | ✅ |
| 2.4 | Configurar `app/` (React 19 + Vite 7 + Tailwind 3 + Font Awesome + SweetAlert2 + Zustand + React Router) | ✅ |
| 2.5 | Configurar `server/` (Express 4 + better-sqlite3 + JWT + bcryptjs + esquema completo de BD) | ✅ |
| 2.6 | Configurar `desktop/` (Electron 44 + preload con contextIsolation + IPC seguro + electron-builder NSIS) | ✅ |
| 2.7 | Configurar `landing/` (React + Vite mismo stack, puerto 5174) | ✅ |
| 2.8 | Crear estructura semántica completa: SkipLink, `<header>` con buscador global, `<aside>` con nav ARIA + menú móvil, `<main>` con rutas, `<footer>` con versión (CU-55) | ✅ |
| 2.9 | Crear páginas placeholder: Home, Buscar, RecetaDetalle, MisRecetas, Favoritos, Ajustes, Login | ✅ |
| 2.10 | `npm install` (636 paquetes), lint, format, builds app/landing, health check, prueba Electron | ✅ (evidencias en sección 6) |

---

## 3. Entregables generados

### Raíz (7)
```
package.json                 # workspaces + scripts globales
eslint.config.mjs             # flat config (browser + node + reglas React)
.prettierrc.json / .prettierignore
.gitignore / .editorconfig
README.md                     # base (se completa en Fase 9)
```

### `app/` — Demo web (22)
```
app/package.json, vite.config.js (proxy /api→3001), tailwind.config.js, postcss.config.js,
index.html (lang=es, meta descripción), .env.example
app/src/main.jsx              # BrowserRouter + FA + SweetAlert2 + estilos
app/src/App.jsx               # layout semántico + rutas + aplica tema/modo en <html>
app/src/styles/index.css      # tokens RGB + glass + accesibilidad (base canónica)
app/src/store/themeStore.js   # Zustand + persist (localStorage)
app/src/services/api.js       # cliente HTTP con manejo de errores y token
app/src/components/layout/    # SkipLink, AppHeader, AppSidebar, AppFooter
app/src/pages/                # Home, Buscar, RecetaDetalle, MisRecetas, Favoritos, Ajustes, Login
```

### `server/` — API (6)
```
server/package.json           # express 4, better-sqlite3, jwt, bcryptjs, cors, dotenv
server/.env.example           # PORT, JWT_SECRET, API keys opcionales, DATABASE_URL
server/src/index.js           # app Express + middleware + errores
server/src/db/database.js     # SQLite + esquema completo (10 tablas) + auditoría
server/src/routes/health.js   # GET /api/health (verifica BD)
server/src/middleware/errorHandler.js
```

### `desktop/` — Electron (3)
```
desktop/package.json          # electron 44 + electron-builder 26 (NSIS, appId, instalador no one-click)
desktop/main.js               # ventana segura, loadURL dev / loadFile prod, setWindowOpenHandler
desktop/preload.js            # contextBridge: window.sazonlab.appInfo()
```

### `landing/` — Web oficial (8)
```
landing/package.json, vite.config.js (5174), tailwind.config.js, postcss.config.js,
index.html (SEO: description, OG tags), src/main.jsx, src/App.jsx (header/main/footer + hero + features + descarga),
src/styles/index.css (mismo lenguaje glass)
```

### Documentación (2)
```
docs/informes/fase-1.md       # este informe
docs/CHANGELOG.md             # entrada Fase 1
```

**Total: ~46 archivos nuevos.**

---

## 4. Decisiones técnicas (matriz de versiones conservadoras)

Se eligió la versión **inmediatamente anterior al major actual** en herramientas de build críticas (más parches, menos riesgo) y **majors actuales maduros** en librerías de runtime (compatibilidad entre pares):

| Paquete | Versión elegida | Última disponible | Razón |
|---|---|---|---|
| react / react-dom | `^19.3.1` | 19.3.1 | Major actual, estable ~23 meses; ecosistema (router 7, zustand 5) afinado a React 19 |
| vite | `^7.3.8` | 8.3.7 | Vite 7 maduro desde jun-2025 (~17 meses); **plugin-react 6 solo soporta vite 8** → par conservador `vite 7 + plugin-react 5.2` |
| tailwindcss | `^3.4.19` | 4.3.5 | Tailwind 3 clásico: config JS, PostCSS, sin cambios del modelo CSS-first de v4 |
| express | `^4.22.3` | 5.3.0 | API estable conocida, sin cambios de path-to-regexp v8 |
| react-router-dom | `^7.18.5` | 7.18.5 | Mismo API declarativo que v6; evita conflictos de peers con React 19 |
| eslint / @eslint/js | `^9.39.5` | 10.14.0 | Flat config maduro; eslint-plugin-react-hooks 7 soporta `^9` y `^10` |
| electron | `^44.10.2` | 45.2.3 | Electron 44 (ago-2026) con 10 patches; 45 tiene solo ~2 semanas |
| electron-builder | `^26.18.0` | 26.18.0 | Major actual maduro (desde inicios de 2025) |
| better-sqlite3 | `^13.0.3` | 13.0.3 | `engines: node>=22` ✓; el más nuevo = mejor cobertura de prebuilds para Node 26 |
| bcryptjs | `^3.0.3` | 3.0.3 | bcrypt en **JS puro** → cero compilación nativa en Windows (misma familia de algoritmo) |
| zustand | `^5.1.0` | 5.1.0 | Major actual, API `create+persist` estable |
| dotenv | `^16.6.1` | 18.0.10 | API `config()` inalterable en v16 (battle-tested) |
| @fortawesome/fontawesome-free | `^6.7.2` | 7.3.1 | FA6: clases `fa-solid fa-x` verificadas |
| sweetalert2 | `^11.26.25` | — | Actual |

Otras decisiones:

1. **Colores en formato canal RGB** (`--primary: 2 132 199` + `rgb(var(--primary) / <alpha-value>)`): habilita modificadores de opacidad (`bg-primary/15`) — **imprescindible para el glassmorphism** y para los 36 temas de la Fase 2.
2. **Esquema de BD completo desde la Fase 1** (10 tablas según el modelo de dominio del IEEE: users, user_preferences, recipes, recipe_ingredients, recipe_steps, recipe_versions, favorites, search_history, ingredients, audit_log) con `CREATE TABLE IF NOT EXISTS` idempotente → sin rework en fases siguientes.
3. **Electron seguro**: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, IPC solo vía `ipcMain.handle` con canal único `app:info`, bloqueo de `window.open` hacia el exterior.
4. **Requisito confirmado por el cliente (09/11/2026):** el `.exe` debe incluir **tanto la base de datos SQLite local (modo offline) como todos los assets compilados** (CSS Tailwind, Font Awesome, SweetAlert2, JS) dentro del instalador → queda registrado para la Fase 8 (`files` de electron-builder ya incluye `renderer/**/*`).
5. **Zustand persist** en `themeStore` con atributos `data-theme`/`data-mode` en `<html>` (hoy: modo claro/oscuro operativo; 12 temas en Fase 2).
6. **Vite proxy** `/api → localhost:3001` en desarrollo (sin CORS en dev).

---

## 5. Problemas encontrados y resolución

| N° | Problema | Solución |
|----|----------|----------|
| 5.1 | ESLint marcaba como "no usados" todos los componentes usados solo en JSX (24 falsos positivos) — sin `eslint-plugin-react` la regla `no-unused-vars` no detecta uso en JSX | Instalado `eslint-plugin-react@7.37.5` y regla `react/jsx-uses-vars: error` → **lint 0 errores** |
| 5.2 | Build falló: `The 'bg-primary/15' class does not exist` — Tailwind no puede inyectar alfa en colores definidos como `var(--x)` | Tokens RGB canales + `rgb(var(--x) / <alpha-value>)` en ambos `tailwind.config.js` (app y landing) |
| 5.3 | npm 11.20 bloquea scripts de instalación (`better-sqlite3`, `esbuild`, `electron-winstaller`) con aviso `allowScripts` | **Verificado que todo funciona sin ellos**: better-sqlite3 prueba CRUD ✅, esbuild compila ✅, Electron 44.10.2 arranca ✅. Decisión conservadora: no aprobar scripts (correr `node-gyp rebuild` podría romper instalaciones que ya funcionan). Documentado como aviso cosmético |
| 5.4 | `navigator.onLine` no es fiable en el proceso main de Electron | Eliminado del IPC `app:info`; el estado offline lo reportará el renderer (Fase 8) |
| 5.5 | Aviso: `eslint@9.39.5 no longer supported` (EOL desde la v10) | Aceptado: es tooling de desarrollo sin ejecución en producción; la config flat usa solo APIs vigentes. Migración a v10 opcional en Fase 9 |
| 5.6 | Match del título en prueba de preview falló por codificación de acentos en PowerShell | Re-verificado con `Encoding.UTF8.GetString` → OK |

---

## 6. Evidencias (comandos ejecutados y resultados)

```text
$ node -v                       → v26.13.0
$ npm -v                        → 11.20.0

$ npm install                   → added 636 packages (547 + 89), sin errores

$ npm run lint                  → ✅ 0 errores, 0 warnings
$ npm run format                → ✅ 46 archivos, estilo unificado

$ npm run build:app             → ✅ vite v7.3.8, 59 módulos, 2.85s
                                    index.css 122.33 kB (31 kB gzip)
                                    index.js  284.76 kB (89 kB gzip)

$ npm run build:landing         → ✅ vite v7.3.8, 30 módulos, 1.86s

$ node src/index.js (server) + Invoke-WebRequest /api/health
                                → HTTP 200 {"status":"ok","service":"sazonlab-api",
                                  "version":"1.0.0","database":"ok",
                                  "timestamp":"2026-11-10T01:48:09.350Z"} ✅
                                  (la BD creó 10 tablas en server/data/sazonlab.db)

$ node -e "…better-sqlite3…"    → better-sqlite3 OK: { c: 1 } ✅ (INSERT + SELECT)

$ npx electron --version        → v44.10.2 ✅ (binario descargado)

$ node --check desktop/main.js / preload.js   → sintaxis OK ✅

$ npx vite preview (app/dist)   → HTTP 200 · title OK · #root OK · assets JS OK ✅
```

### Estructura verificada (árbol final)

```
recetario/
├── package.json  eslint.config.mjs  .prettierrc.json  .gitignore  README.md …
├── app/     (React+Vite+Tailwind, 22 archivos) ✅ build
├── server/  (Express+SQLite, 6 archivos)       ✅ health 200
├── desktop/ (Electron+builder, 3 archivos)     ✅ electron 44.10.2
├── landing/ (React+Vite, 8 archivos)           ✅ build
└── docs/    (IEEE + informes + CHANGELOG)
```

---

## 7. Checklist de cumplimiento (Fase 1)

- [x] Monorepo inicializado con npm workspaces (4 espacios de trabajo)
- [x] `app/` configurado: React + Vite + TailwindCSS + Font Awesome + SweetAlert2
- [x] `server/` configurado: Express + proxy/health + esquema SQLite completo
- [x] `desktop/` configurado: Electron + preload con `contextIsolation` + electron-builder (NSIS)
- [x] `landing/` configurada: React + Vite + Tailwind (mismo stack)
- [x] ESLint (flat) + Prettier configurados → `lint` 0 errores
- [x] Estructura semántica base: `<header>`, `<aside>`, `<main>`, `<footer>` + skip-link + ARIA
- [x] Navegación con 7 rutas funcionales y estados visuales glass
- [x] Instalación verificada (636 paquetes) y builds de producción OK
- [x] API responde `200` con BD operativa
- [x] `docs/informes/fase-1.md` y `docs/CHANGELOG.md` actualizados
- [ ] Pendiente fases siguientes: temas 12×3, auth real, búsqueda API/IA, CRUD, etc.

---

## 8. Cómo ejecutar (referencia)

```bash
npm install
npm run dev:server    # API → http://localhost:3001
npm run dev:app       # Web → http://localhost:5173  (proxy /api automático)
npm run dev:landing   # Landing → http://localhost:5174
npm run dev:desktop   # Electron (requiere dev:server + dev:app)
npm run lint && npm run format
```

---

**Fase 1 completada. Esperando aprobación explícita (`APROBADO`) para iniciar la Fase 2 (sistema de temas 12 × 3 + Liquid Glass).**
