# Informe de Fase 8 — Electron + `.exe` NSIS + modo offline SQLite

**Fecha:** 2026-11-11
**Estado:** ✅ Completada
**Sprint IEEE equivalente:** 10 (entrega de escritorio / Hito 11)

---

## 1. Objetivo

Requisito explícito del cliente confirmado en Fase 1: el `.exe` debe incluir

- **SQLite local (modo offline)**: la app de escritorio funciona sin servidor externo;
- **todos los assets compilados** (CSS, Font Awesome, SweetAlert2, JS) **dentro del instalador**.

Es decir: un solo instalador NSIS que abre la app completa, con su propia API local y su
propia base de datos, sin necesidad de Node, npm ni internet instalados.

---

## 2. Arquitectura (decisiones conservadoras)

```
SazonLab.exe (Electron 44, proceso principal)
├── API embebida  → fork de server/src/index.js con ELECTRON_RUN_AS_NODE=1
│                    puerto fijo 4731 (SAZONLAB_PORT lo permite cambiar;
│                    el dev server usa 3001 → sin conflicto)
│                    SQLite en %APPDATA%\SazonLab\sazonlab.db
│                    (SAZONLAB_DATA_DIR = app.getPath('userData'))
└── Renderer      → loadFile('renderer/index.html', { search: '?apiPort=4731' })
                     app detecta location.protocol === 'file:' y arma
                     http://127.0.0.1:4731/api (ver app/src/services/api.js)
```

| Decisión | Por qué |
|----------|---------|
| API como **proceso hijo** (`fork`) | Un crash del API no tumba la UI; se mata junto con el padre en `will-quit` (sin huérfanos). |
| Puerto **fijo 4731** | Evita el handshake por IPC; el renderer lo recibe como query param. Distinto de 3001 (dev) y 5173/5174 (Vite). |
| **`better-sqlite3` desempaquetado** (`asarUnpack: **/node_modules/**` + `server/**/*`) | `dlopen` no puede leer dentro del asar; además el server resuelve `express`/etc. caminando hacia arriba hasta `app.asar.unpacked/node_modules`. Cero lecturas al asar desde el proceso hijo. |
| **`productName` top-level `SazonLab`** | `app.getPath('userData')` es determinista: `%APPDATA%\SazonLab`. |
| SQLite en **userData**, no en `Program Files` | Escritura en directorio de usuario (UAC) y datos que sobreviven a actualizaciones. |
| `cors()` default (origen `*`) | `file://` envía `Origin: null`; el servidor ya lo acepta sin cambios. |
| Sondeo de TheMealDB **try/catch** (Fase 5) | Sin internet la app sigue funcionando: los datos locales no dependen de la red. |
| **`ELECTRON_RUN_AS_NODE=1`** | El mismo binario del `.exe` ejecuta Node: no hace falta instalar Node en la máquina del usuario. |
| **`npmRebuild: false`** | `@electron/rebuild` intentaba compilar `better-sqlite3` con node-gyp (requiere Python, ausente). El **prebuild oficial ya carga en Electron 44** (test `ABI-OK` con `ELECTRON_RUN_AS_NODE`), así que se empaqueta tal cual: sin toolchain en la máquina de build. |

---

## 3. Actividades realizadas

| # | Actividad | Archivos |
|---|-----------|----------|
| 1 | **BD configurable**: `SAZONLAB_DATA_DIR` redirige `sazonlab.db` (en el `.exe` apunta a `userData`; en desarrollo sigue en `server/data`) | `server/src/db/database.js` |
| 2 | **Descubrimiento de API**: en `file://` el cliente arma `http://127.0.0.1:{apiPort}/api`; `VITE_API_URL` sigue teniendo prioridad | `app/src/services/api.js` |
| 3 | **Proceso principal con API embebida**: `fork` del server con `ELECTRON_RUN_AS_NODE`, espera activa de `/api/health` (máx. 10 s), icono de ventana, `loadFile` con `?apiPort=`, cierre del hijo en `will-quit`/`exit` | `desktop/main.js` |
| 4 | **Empaquetado**: dependencias de runtime del server en `desktop/package.json`, `files` con `renderer/**` + `server/**`, `asarUnpack` de `server/**` y `**/node_modules/**`, `productName` | `desktop/package.json` |
| 5 | **Pipeline de build**: `sincronizar:desktop` copia `app/dist → desktop/renderer` y `server/src + server/package.json → desktop/server` (el `package.json` declara `type: module`); `build:exe` = build:app → sincronizar → electron-builder | `scripts/sincronizar-desktop.cjs`, `package.json` |
| 6 | **Suite** `npm run verificar:desktop` (estático + dinámico, ver §4) | `scripts/verificar-desktop.mjs` |

---

## 4. Verificación (`npm run verificar:desktop`)

La suite comprueba en el **artefacto empaquetado real** (`desktop/release/win-unpacked`):

**Estático**
- `win-unpacked/SazonLab.exe` existe.
- El asar contiene: `renderer/index.html`, `server/src/index.js`, `server/package.json`, `main.js`, `preload.js` y assets compilados (CSS/JS).
- Está desempaquetado: `server/src/index.js`, `express`, `better-sqlite3` con `prebuilds/win32-x64.node`.

**Dinámico** (lanza el `.exe` con `--remote-debugging-port`)
1. `/api/health` responde en `127.0.0.1:4731` con `status: ok` y `database: ok`.
2. La ventana carga desde `file://` (objetivo CDP) y **React está montado** en `#root`.
3. El renderer descubre la API (`protocol: file:` + `apiPort=4731`).
4. Flujo real sobre la BD local: registro → crear receta → listar → favorito.
5. Al cerrar: el puerto 4731 queda libre (sin API huérfana) y **`%APPDATA%\SazonLab\sazonlab.db` fue creada en esta corrida** (la previa se renombra antes de arrancar).

**Resultado:** ✅ **23/23 checks TODO OK** en el artefacto real (la suite
renombra la BD previa, lanza el `.exe`, valida API+UI+flujo y cierra el árbol
de procesos).

---

## 5. Batería de verificación

| Comando | Resultado |
|---------|-----------|
| `npm run verificar:desktop` | ✅ 23/23 (estático + dinámico sobre el `.exe` empaquetado) |
| `npm run lint` / `format` | ✅ 0 errores (ignores ampliados para `desktop/server/**` generado) |
| `npm test` | ✅ 18/18 |
| `npm run verificar:a11y` | ✅ 11/11 |
| `npm run verificar:ui-f6` | ✅ 29/29 |
| `npm run verificar:ui-f5` | ✅ 37/37 |
| `npm run verificar:contraste` | ✅ 36/36 |
| `npm run verificar:temas` | ✅ 4/4 |
| `npm run verificar:busqueda` | ✅ 68/68 |
| `npm run verificar:recetas` | ✅ 39/39 |
| `npm run verificar:auth` | ✅ 27/27 |
| `npm run verificar:cuenta` | ✅ 27/27 |
| `npm run verificar:landing` | ✅ 38/38 + axe 5/5 estados |
| `build:app` / `build:landing` / `build:exe` | ✅ |
| Demo `:5173` / API `:3001` / landing `:5174` / robots / logo / `.exe` | ✅ 200 × 6 (`.exe` **124.7 MB**) |

---

## 6. Pendientes registrados

- `sitemap.xml` real cuando exista dominio de publicación (el robots.txt ya lo referencia).
- Code signing del `.exe` (SmartScreen lo marcará como desconocido mientras no haya certificado).
