# Informe de Fase 10 — Nube, IA local, chatbot, correo real, responsive y manual

**Fecha:** 2026-11-15
**Estado:** ✅ Completada
**Sprint IEEE equivalente:** 11–12 (ampliación del cierre: Sprint 11 «corrección de hallazgos» + Hito 12)

---

## 1. Objetivo

Ampliación del proyecto a partir de las peticiones finales del cliente:

| Petición | Entregable |
|----------|------------|
| «Recuperación de contraseñas mediante correo y que funcione» | Envío **real** por SMTP/Resend + enlace de un clic + configuración desde la app + pruebas automatizadas |
| «Conectado a una nube o algo» | **PostgreSQL en la nube** (`DATABASE_URL`) con sincronización bidireccional y botón «Sincronizar con la nube» |
| «Agregale una IA local y un chatbot» | Cliente **Ollama** (IA local) + **chatbot** con historial y respaldo determinista |
| «Cambia la base de datos por una sólida» | Capa PostgreSQL + replicación SQLite↔Postgres (la nube es el almacén de verdad; SQLite queda como caché/offline, necesario para el `.exe`) |
| «Responsive design para tablet y celular» | Segunda fila de búsqueda en móvil, cabecera compacta, suite responsive propia (390×844, 768×1024, 1280×900) |
| «Manuales de usuario en md y pdf» | `docs/MANUAL_USUARIO.md` + `docs/MANUAL_USUARIO.pdf` (8 páginas) generados con `npm run manual:pdf` |
| «Organiza las carpetas» | Raíz limpia: `apps/{web,api,desktop,landing}` + `docs/`, `scripts/`, `assets/`, `legal/` |
| «Los menús del navbar se cierren automáticamente» | Cierre por scroll, redimensionado, cambio de ruta, foco y `Esc` |
| «Credenciales de administrador más cortas» | `admin@sazonlab.test` / `admin1234` (reseteable en cada arranque) |

---

## 2. Arquitectura de la Fase 10

```
┌──────────────────────────── NAVEGADOR / .exe ────────────────────────────┐
│  React 19 + Vite (apps/web)  ·  Tailwind  ·  Zustand                     │
│  Buscador global · Chatbot · Panel de correo · Panel de nube            │
└───────────────────────────────┬───────────────────────────────────────────┘
                                │ /api (proxy en dev; 127.0.0.1:4731 en el .exe)
┌───────────────────────────────▼───────────────────────────────────────────┐
│  Express (apps/api)                                                    │
│   ├── /api/auth      registro, login, recuperación por CÓDIGO o ENLACE   │
│   ├── /api/chat      chatbot (Ollama → OpenAI → Gemini → local)          │
│   ├── /api/correo    estado · configurar (admin) · correo de prueba      │
│   ├── /api/nube      estado · sincronizar                                 │
│   └── /api/admin     gestión de usuarios (RF-22)                          │
└───────┬─────────────────────────────────────────────┬────────────────────┘
        │                                             │
   ┌────▼─────────────────────┐            ┌──────────▼──────────────────┐
   │ PostgreSQL (nube)        │            │ SQLite local (caché/offline) │
   │ sazonlab_usuarios        │◄── sync ──►│ users, recipes, favorites…   │
   │ sazonlab_recetas         │  última    │ %APPDATA%\SazonLab (escritorio)│
   │ sazonlab_favoritos       │  escritura │ server/data (web/demo)       │
   │ sazonlab_preferencias    │  gana     │                              │
   └──────────────────────────┘            └──────────────────────────────┘
```

**Decisión clave (conservadora):** la nube es el almacén de verdad, pero **SQLite
sigue siendo la caché local** porque el `.exe` debe funcionar **sin internet**
(requisito de la Fase 8). La sincronización replica en ambos sentidos con regla
*última escritura gana* usando `actualizado_en`.

---

## 3. Correo de recuperación que sí funciona

### 3.1 Transporte

| Modo | Configuración | Notas |
|------|---------------|-------|
| **SMTP** | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `MAIL_FROM` | nodemailer; Gmail (465/secure), Outlook (587), SMTP corporativo |
| **Resend** | `RESEND_API_KEY` | API por `fetch`, sin librería |
| **Demo** | — | el código se muestra en pantalla y en la consola |

### 3.2 Configuración «una vez para todos»

- **Panel en la app**: Ajustes → *Correo de recuperación* (solo administradores):
  proveedor, host, puerto, usuario, contraseña de aplicación y remitente →
  **«Guardar configuración»** + **«Enviar correo de prueba»**.
- Se guarda en `apps/api/.env` y **se aplica en caliente** (sin reiniciar).
- `npm run configurar:correo` no es necesario: la app trae el asistente visual.

### 3.3 Recuperación por código y por enlace

- `POST /api/auth/olvide-contrasena` → código de 6 dígitos **+ token de enlace**.
- El correo lleva ambos: el código y un botón «Restablecer contraseña» →
  `/#/recuperar?token=…`.
- `POST /api/auth/restablecer-contrasena` acepta `{correo, codigo}` o `{token}`.
- La página `/recuperar` (nueva) pide solo la contraseña nueva.
- 15 minutos de vigencia, máximo 5 intentos, todo auditado.

### 3.4 Verificación

`server/src/services/mailer.test.js` levanta un **servidor SMTP real** (mínimo,
en `node:net`) y comprueba que el correo sale con el código y el enlace
(`✔ 23/23` pruebas unitarias).

---

## 4. IA local y chatbot

| Pieza | Detalle |
|-------|---------|
| `services/ollama.js` | Cliente de Ollama (`OLLAMA_HOST`, por defecto `http://localhost:11434`): lista modelos, chat y estado. |
| `services/ia.js` | Cadena **Ollama → OpenAI → Gemini → ninguna**; `estadoIA()` informa del motor activo. |
| `services/chat.js` | Chatbot con contexto (recetas del usuario) y **asistente local determinista** que responde con datos reales: recetas del catálogo, tus recetas, medidas, temas. |
| `routes/chat.js` | `POST /api/chat`, `GET/DELETE /api/chat/historial`, `GET /api/chat/estado`. |
| `app/src/pages/Chat.jsx` | Página del chat (responsive, historial en servidor, chips de sugerencias,examples). |

> El chatbot **siempre responde**: sin ninguna IA instalada usa el asistente local.

---

## 5. Nube (PostgreSQL) y estado del sistema

- `db/postgres.js`: pool `pg`, esquema remoto (`sazonlab_usuarios|recetas|favoritos|preferencias`
  con `JSONB`), upsert portable (UPDATE + INSERT) y comprobación de conexión.
- `services/nube.js`: `sincronizar(correo)` (sube lo más nuevo, baja lo más nuevo)
  y `estadoNube()`.
- `routes/nube.js`: `GET /api/nube/estado`, `POST /api/nube/sincronizar`.
- Ajustes → *Sistema, IA y nube*: motor de base de datos, estado de la IA, del
  correo y de la nube, con botón de sincronización.
- **Verificado con PostgreSQL embebido** (`pg-mem`, mismo dialecto) en
  `services/nube.test.js`: subida ✓, descarga de lo más nuevo ✓, estado ✓.

---

## 6. Responsive (celular y tablet)

| Cambio | Detalle |
|--------|---------|
| Cabecera | el logotipo textual se oculta en móvil; el grupo de botones no desborda. |
| Buscador global | **segunda fila a ancho completo** en móvil/tablet (`#buscador-global-movil`). |
| Menú lateral | overlay con botón de menú, enlaces de 45 px de alto (área táctil cómoda). |
| Chat | columna flexible, entrada fija al pie, chips de ejemplo. |
| Ajustes | rejillas de 1→2 columnas; sección de correo y de sistema en tarjetas. |

**Suite nueva `npm run verificar:movil`** (`scripts/verificar-movil.cjs`): 33 checks
que recorren 7 páginas en 3 tamaños (390×844, 768×1024, 1280×900) verificando
**cero desbordamiento horizontal**, apertura del menú, área táctil, buscador y chat.

---

## 7. Organización de carpetas

```
recetario/
├── apps/
│   ├── web/       → antes app/        (demo web + renderer del .exe)
│   ├── api/       → antes server/     (Express + SQLite + Postgres)
│   ├── desktop/   → antes desktop/    (Electron + electron-builder)
│   └── landing/   → antes landing/    (página oficial)
├── docs/          informes, evidencias, manual (MD+PDF), informe final, acta
├── scripts/       12 suites + generadores (logo, manual PDF, copiar .exe)
├── assets/        logo de marca (SVG fuente)
├── legal/         textos legales compartidos
└── package.json   monorepo npm workspaces
```

Actualizados: `package.json` (workspaces y scripts), `eslint.config.mjs`,
`.prettierignore`, `.gitignore`, `tailwind.config.js` de web y landing, imports
del módulo legal, `scripts/sincronizar-desktop.cjs`, `copiar-exe.cjs`,
`generar-logo.cjs`, `capturas.cjs`, `verificar-desktop.mjs`, `verificar-temas.cjs`,
`verificar-contraste.mjs` y `apps/desktop/package.json` (+ `nodemailer`, `pg`).

---

## 8. Manual de usuario

- `docs/MANUAL_USUARIO.md` — 16 secciones: instalación, cuenta, recuperación por
  correo, buscador, asistente, recetas, compartir, medidas, temas y accesibilidad,
  correo, nube, administración, escritorio, preguntas frecuentes y atajos.
- `docs/MANUAL_USUARIO.pdf` — 8 páginas A4 con portada de marca, índice visual y
  numeración de páginas (`npm run manual:pdf`; Markdown → HTML con `marked` → PDF
  con `printToPDF` de Electron, sin dependencias nuevas).
- Publicado también en la landing (`apps/landing/public/MANUAL_USUARIO.pdf`) con
  enlace en el pie y en la sección de descarga.

---

## 9. Otros cambios de la fase

| Cambio | Detalle |
|--------|---------|
| Menús del navbar | se cierran solos al hacer scroll, redimensionar, cambiar de ruta, perder el foco o pulsar `Esc` |
| Credenciales admin | `admin@sazonlab.test` / `admin1234`, restablecidas en cada arranque (documentadas) |
| Logo | regenerado en todas sus variantes (ya en Fase 9) |

---

## 10. Verificación

| Suite | Resultado |
|-------|-----------|
| `npm test` | ✅ 23/23 (18 + 2 de correo SMTP + 3 de nube) |
| `npm run lint` / `format` | ✅ 0 errores |
| `npm run verificar:movil` | ✅ 33/33 (nueva) |
| `npm run verificar:ui-f5` | ✅ 66/66 |
| `npm run verificar:auth` | ✅ 41/41 |
| Resto de suites | ✅ en verde (ver §11) |

---

## 11. Pendientes

- **Firma digital** del `.exe` (SmartScreen).
- **Dominio de publicación** para el `sitemap.xml` y el correo desde el dominio propio.
- **PostgreSQL en producción**: la replicación está lista y probada; falta apuntar
  `DATABASE_URL` a un servicio real (Neon/Supabase) y decidir la cadencia de la
  sincronización automática (hoy es manual desde Ajustes).
- **Modelos de Ollama**: la app detecta los instalados; falta decidir cuál recomendar
  por equipo y documentar el consumo de memoria.
