# FASE 0 — Descubrimiento y definición

**Proyecto:** Recetario Inteligente — SazónLab
**Fecha:** 09/11/2026
**Estado:** ✅ Completada — pendiente de aprobación

---

## 1. Objetivo

Leer y comprender el documento IEEE completo (`docs/IEEE_Recetario_Inteligente.md`), confirmar el stack tecnológico, la estructura de carpetas y el alcance del MVP, y dejar documentada la definición que regirá las fases 1 a 9 del desarrollo.

---

## 2. Actividades realizadas

| N° | Actividad | Resultado |
|----|-----------|-----------|
| 2.1 | Localizar el documento IEEE fuente en `C:\Users\ruato\Downloads\deepseek_markdown_20261110_42b768.md` | Encontrado (2.207 líneas / 151.679 caracteres) |
| 2.2 | Leer el IEEE completo (secciones 1 a 4, incluida entrevista de 120 preguntas, 57 CU, 10 CU especificados, matriz de trazabilidad, cronograma SCRUM de 12 sprints y wireframes) | Lectura íntegra finalizada |
| 2.3 | Copiar el IEEE al repositorio como `docs/IEEE_Recetario_Inteligente.md` | Copia byte a byte verificada (SHA256 idéntico al origen) |
| 2.4 | Extraer requisitos clave: 12 RS, 25 RF, 10 RNF, 3 roles, 36 combinaciones tema×modo | Extraído y consolidado (ver sección 3) |
| 2.5 | Definir y confirmar stack tecnológico | Definido (ver sección 4) |
| 2.6 | Definir estructura de carpetas del monorepo | Definida (ver sección 5) |
| 2.7 | Definir alcance del MVP y su mapeo a fases | Definido (ver sección 6) |
| 2.8 | Registrar decisiones técnicas y riesgos | Registradas (ver secciones 7 y 8) |
| 2.9 | Crear `docs/CHANGELOG.md` con la entrada inicial | Creado |

---

## 3. Consolidación de requisitos extraídos del IEEE

### 3.1. Requisitos cuantitativos

| Elemento | Cantidad |
|----------|----------|
| Requisitos del Sistema (RS) | 12 (RS-01 a RS-12) |
| Requisitos Funcionales (RF) | 25 (RF-01 a RF-25) |
| Requisitos No Funcionales (RNF) | 10 (RNF-01 a RNF-10) |
| Casos de uso identificados | 57 (CU-01 a CU-57) |
| Casos de uso especificados en detalle | 10 |
| Roles / actores | 3 (Administrador, Usuario Registrado, Invitado) |
| Temas × modos | 12 × 3 = 36 combinaciones |
| Diagramas Mermaid | 5 (2 actividades, 1 dominio, 1 contexto, 1 casos de uso) |
| Preguntas de elicitación | 120 |
| Sprints planificados (SCRUM) | 12 (0 a 11) |

### 3.2. Prioridades de los RF (base del MVP)

- **ALTA (17):** RF-01 a RF-09, RF-13 a RF-19, RF-22, RF-23 → obligatorios en el MVP.
- **MEDIA (7):** RF-10, RF-11, RF-12, RF-20, RF-21, RF-24 → incluidos en el MVP.
- **BAJA (1):** RF-25 (onboarding) → incluido si el tiempo lo permite; tiene fase propia asignada (Fase 6/7 según prioridad).

### 3.3. Restricciones duras del IEEE (no negociables)

1. `.exe` generado con **Electron** + `electron-builder` (NSIS).
2. Iconografía **Font Awesome** en toda la interfaz.
3. **SweetAlert2** para confirmaciones críticas.
4. Estilo **glassmorphism / Liquid Glass** en todos los temas y modos.
5. **WCAG 2.1 AA** obligatorio; modo alto contraste con **AAA en texto principal**.
6. Estructura semántica **`<header>`, `<aside>`, `<main>`, `<footer>`** + landmarks ARIA.
7. Contraseñas cifradas con **bcrypt**; control de acceso por roles; auditoría de operaciones críticas.
8. Borrado lógico (papelera 30 días), nunca eliminación física con historial.
9. Navegadores: Chrome, Edge, Firefox, Safari. Escritorio: Windows 10+. Responsive obligatorio.
10. Español como idioma principal (arquitectura preparada para inglés).

### 3.4. Alcance negativo (NO incluido en el MVP)

- Pasarela de pago real.
- Red social culinaria (seguir, comentarios, likes, calificaciones → fase 2).
- Reconocimiento de imágenes por cámara.
- Aplicación móvil nativa (solo responsive).
- Soporte multilingüe completo.
- Integración con supermercados/domicilios.
- Listas de compras y planificador semanal (funcionalidad futura priorizada como "Could").

---

## 4. Stack tecnológico confirmado

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend | **React 18 + Vite + TailwindCSS** | Requerido por el prompt; HMR rápido, build optimizado |
| Estado | **Zustand** (con `persist` middleware) | Menos boilerplate que Context API; persistencia integrada a localStorage |
| Backend/API | **Node.js + Express** | Proxy de APIs externas + auth + auditoría |
| APIs externas | **TheMealDB** (fallback gratuito, siempre disponible) + **OpenAI/Gemini** (opcional vía API key en `.env`) | RF-03/RF-04 con degradación elegante si la IA no está configurada |
| BD (web) | **PostgreSQL si `DATABASE_URL` está definido; SQLite (`better-sqlite3`) por defecto** | Satisface "PostgreSQL o Firestore (web)" del stack obligatorio, manteniendo la demo cero-configuración |
| BD (escritorio) | **SQLite local** (`better-sqlite3` en userData) | Modo offline básico del `.exe` (RF-20) |
| Autenticación | **JWT + bcrypt** + middleware de roles | RS-09, RF-01, RF-02 |
| Escritorio | **Electron** (`main.js` + `preload.js` con `contextIsolation: true` + IPC seguro) | Restricción dura del IEEE |
| Empaquetado | **electron-builder** (target NSIS → `.exe`) | Restricción dura |
| Iconos | **Font Awesome Free** (npm `@fortawesome/fontawesome-free`) | Restricción dura |
| Alertas | **SweetAlert2** | Restricción dura |
| Toasts / Modales | **Sistema propio** (coherente con glassmorphism) | RF-15, RF-16 |
| Accesibilidad | Landmarks ARIA, skip-link, foco visible, axe DevTools + NVDA (Fase 6) | RNF-07 |
| Lint/Formato | **ESLint (flat config) + Prettier** | Calidad de código, RNF-04 |

### 4.1. Decisiones de arquitectura

1. **Monorepo con npm workspaces** (`app`, `server`, `desktop`, `landing`, raíz).
2. **Vite proxy** `/api → http://localhost:3001` en desarrollo; en producción Express sirve `app/dist` estático (misma origina → sin CORS en producción).
3. **Sistema de temas por variables CSS**: `<html data-theme="oceano" data-mode="oscuro">` + bloque `<style>` generado dinámicamente desde `app/src/themes/`. 12 archivos de tema × 3 modos.
4. **Electron en producción** carga `app/dist/index.html` (`loadFile`); en desarrollo apunta al dev server de Vite. El renderer NO tiene `nodeIntegration`; todo pasa por `preload.js` (contextBridge) e IPC validado (`ipcMain.handle` con canales whitelisted).
5. **Persistencia**: web → `localStorage` (Zustand persist) + servidor (PostgreSQL/SQLite); escritorio → SQLite local + archivo `config.json` en `userData` para preferencias.
6. **Papelera 30 días**: columna `deleted_at` (borrado lógico) + limpieza programada; historial de versiones en tabla `recipe_versions`.
7. **Puertos**: server `3001`, app dev `5173`, landing dev `5174`.
8. **Node.js ≥ 18** requerido.

---

## 5. Estructura de carpetas definida (monorepo)

```
recetario/                      # raíz del monorepo (npm workspaces)
├── package.json                # raíz: workspaces + scripts globales
├── README.md                   # generado en Fase 9
├── .eslintrc / .prettierrc     # configuración compartida (Fase 1)
├── .gitignore
├── docs/
│   ├── IEEE_Recetario_Inteligente.md
│   ├── CHANGELOG.md
│   ├── INFORME_FINAL.md        # Fase 9
│   └── informes/
│       ├── fase-0.md … fase-9.md
├── app/                        # React + Vite (demo web + renderer Electron)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/         # glass: Header, Sidebar, Footer, Toast, Modal, cards…
│       ├── pages/              # Home, Buscar, Detalle, MisRecetas, Favoritos, Ajustes, Login…
│       ├── themes/             # 12 temas × 3 modos (36 bloques CSS)
│       ├── styles/             # glass.css, base.css, accesibilidad.css
│       ├── services/           # api.js, mealdb.js, ia.js, auth.js
│       └── store/              # Zustand: auth, theme, recipes, favorites, search…
├── server/                     # Node.js + Express
│   ├── package.json
│   └── src/
│       ├── index.js            # app Express
│       ├── routes/             # auth, recipes, search, admin, export…
│       ├── middleware/         # auth JWT, roles, auditoría, errores
│       ├── db/                 # conexión SQLite/PostgreSQL + migraciones
│       └── services/           # mealdb proxy, IA, auditoría
├── desktop/                    # Electron
│   ├── package.json            # + electron-builder config (NSIS)
│   ├── main.js
│   ├── preload.js
│   └── assets/icon.ico
└── landing/                    # Página oficial (React + Vite)
    ├── package.json
    ├── index.html
    └── src/
```

---

## 6. Alcance del MVP y mapeo fases ↔ sprints IEEE

| Fase (prompt) | Contenido | Sprint IEEE equivalente |
|---------------|-----------|-------------------------|
| Fase 0 | Descubrimiento y definición (este informe) | Sprint 0 |
| Fase 1 | Setup del monorepo, tooling, estructura semántica base | Sprint 0–1 |
| Fase 2 | 12 temas × 3 modos + Liquid Glass + persistencia | Sprint 6 |
| Fase 3 | Auth bcrypt + roles + landmarks ARIA + navegación teclado | Sprint 1 |
| Fase 4 | Búsqueda por ingredientes + TheMealDB + IA + filtros + historial | Sprint 2–3 |
| Fase 5 | CRUD recetas + favoritos + papelera + versiones + export/import + compartir | Sprint 4–5, 9 |
| Fase 6 | Toasts + modales glass + SweetAlert2 + ajustes accesibilidad + pruebas WCAG | Sprint 7–8 |
| Fase 7 | Landing page oficial | Sprint 10 |
| Fase 8 | Electron + `.exe` NSIS + modo offline SQLite | Sprint 10 |
| Fase 9 | Pruebas, despliegue, INFORME_FINAL, README, CHANGELOG | Sprint 11 |

**MVP = Fases 1 a 9** → cubre el 100% de los RF de prioridad ALTA y MEDIA, más los 4 entregables del IEEE (IEEE ✅ ya existe, demo web, landing, `.exe`).

---

## 7. Decisiones técnicas registradas

1. **Zustand** como librería de estado (no Context API) — persistencia `persist` middleware integrada.
2. **SQLite por defecto + PostgreSQL opcional** vía `DATABASE_URL` — la demo arranca sin infraestructura; el despliegue web puede usar PostgreSQL (o migrar a Firestore exportando JSON, dado que el IEEE permite "PostgreSQL **o** Firestore").
3. **TheMealDB como fuente primaria siempre disponible**; OpenAI/Gemini solo se activa si existe `OPENAI_API_KEY` o `GEMINI_API_KEY` en `.env` → RF-04 cumple con fallback (hallazgo 10.5 del IEEE).
4. **Contraseñas**: bcrypt (10 rounds), JWT de 7 días con refresh simple.
5. **Auditoría**: middleware que registra `usuario, fecha, acción, detalle` en tabla `audit_log` para operaciones críticas (RF-23).
6. **Borrado lógico** con `deleted_at` + retención 30 días (RF-08).
7. **Recuperación de contraseña**: flujo completo por token; el envío de correo es opcional vía SMTP en `.env` y, sin SMTP, el token se muestra/copián en la demo (evita dependencia de infraestructura externa).
8. **Modo offline en `.exe`**: SQLite local + `navigator.onLine` con UI de estado offline; las recetas guardadas siempre son consultables (RF-20).
9. **Un solo codebase de renderer**: `app/` es a la vez demo web y renderer de Electron (evita duplicación; el `.exe` simplemente carga su `dist`).

---

## 8. Riesgos identificados

| Riesgo | Impacto | Mitención |
|--------|---------|-----------|
| API key de IA ausente | Medio | TheMealDB siempre disponible; UI indica "sugerencia IA no configurada" sin romper flujo |
| Rate limit TheMealDB (limit 100 req/h en demo key) | Medio | Caché de búsquedas en servidor + clave demo propia + degradación a recetas locales |
| `backdrop-filter` no soportado | Bajo | Fallback a color sólido con opacidad (EX-01 del CU-13) |
| Pruebas NVDA/VoiceOver requieren entorno Windows accesible | Medio | Fase 6 incluye checklist manual + axe DevTools automatizado |
| Generar `.exe` NSIS en esta máquina | Medio | Fase 8: `electron-builder` con target NSIS; verificar antivirus/SmartScreen |
| OneDrive como carpeta de trabajo (posible bloqueo de archivos) | Bajo | Usar rutas relativas; si hay conflictos, migrar a carpeta local en Fase 1 |

---

## 9. Entregables de la fase

- `docs/IEEE_Recetario_Inteligente.md` — copia íntegra del IEEE fuente (SHA256 verificado: `A17E46B8…FE57074`).
- `docs/informes/fase-0.md` — este informe.
- `docs/CHANGELOG.md` — registro inicial de cambios.

---

## 10. Checklist de cumplimiento (Fase 0)

- [x] IEEE leído completo (2.207 líneas, secciones 1–4)
- [x] IEEE ubicado en `docs/IEEE_Recetario_Inteligente.md` (copia byte a byte)
- [x] Stack tecnológico confirmado y justificado (sección 4)
- [x] Estructura de carpetas definida (sección 5)
- [x] Alcance del MVP definido y mapeado a fases/sprints (sección 6)
- [x] Decisiones técnicas documentadas (sección 7)
- [x] Riesgos identificados con mitigaciones (sección 8)
- [x] `docs/informes/fase-0.md` generado
- [x] `docs/CHANGELOG.md` creado

---

## 11. Comandos ejecutados

```powershell
# Copia del IEEE con verificación de integridad
Copy-Item "C:\Users\ruato\Downloads\deepseek_markdown_20261110_42b768.md" "docs\IEEE_Recetario_Inteligente.md"
(Get-FileHash <origen> -Algorithm SHA256).Hash   # A17E46B82948522D6B78FD50E77A19DDAEA204CA4B0D5476295A9D012FE57074
(Get-FileHash "docs\IEEE_Recetario_Inteligente.md" -Algorithm SHA256).Hash  # idéntico ✅
```

---

**Fase 0 completada. Esperando aprobación explícita (`APROBADO`) para iniciar la Fase 1.**
