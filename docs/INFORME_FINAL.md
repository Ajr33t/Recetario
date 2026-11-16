# 📋 Informe Final — Recetario Inteligente «SazónLab»

**Fecha de cierre:** 2026-11-11
**Hito IEEE:** 12 — Cierre del proyecto (Sprint 11)
**Estado:** ✅ **Proyecto completado — 25/25 requisitos funcionales en cumplimiento**

> Especificación de referencia: [`docs/IEEE_Recetario_Inteligente.md`](IEEE_Recetario_Inteligente.md)
> Historial por fase: [`docs/CHANGELOG.md`](CHANGELOG.md) · Informes: [`docs/informes/`](informes/)

---

## 1. Resumen ejecutivo

**SazónLab** es un recetario digital completo que sugiere recetas según los ingredientes
disponibles, permite crear y gestionar recetas propias, compartirlas como **imagen o PDF**,
generar un **libro de cocina** impreso y personalizar toda la experiencia con
**12 temas × 3 modos** (claro, oscuro, alto contraste) sobre un diseño **Liquid Glass**.

Se entregan los 4 productos del alcance:

| Entregable | Ruta | Estado |
|------------|------|--------|
| Documento IEEE | `docs/IEEE_Recetario_Inteligente.md` | ✅ |
| Demo web funcional | `app/` → http://localhost:5173 | ✅ |
| Página oficial / landing | `landing/` → http://localhost:5174 | ✅ |
| Aplicación de escritorio `.exe` (NSIS) | `desktop/` → `SazónLab-Setup-1.0.0.exe` (124.7 MB) | ✅ |

**Cierre de hallazgos (Sprint 11):** la revisión final de cumplimiento detectó 4 brechas
(RF-02 parcial, RF-10 parcial, RF-11 y RF-22 sin implementar) que fueron **corregidas en esta
fase**: panel de administración, filtros avanzados e historial de búsquedas (detalles en
[`informes/fase-9.md`](informes/fase-9.md)).

**Ampliación final (Fase 10):** a petición del cliente se sumó el envío **real** de correos de
recuperación (SMTP/Resend + enlace de un clic), **PostgreSQL en la nube** con sincronización,
**IA local (Ollama) con chatbot**, **responsive** verificado para celular y tablet, el **manual
de usuario en MD y PDF** y una **raíz de proyecto reorganizada** (`apps/{web,api,desktop,landing}`).
Detalle en [`informes/fase-10.md`](informes/fase-10.md).

---

## 2. Cumplimiento de requisitos funcionales (RF-01 … RF-25)

| RF | Requisito | Prioridad | Estado | Implementación / evidencia |
|----|-----------|-----------|--------|----------------------------|
| RF-01 | Autenticación de usuarios | ALTA | ✅ | Registro/login JWT + bcrypt (`server/src/routes/auth.js`); suite `verificar:auth` |
| RF-02 | Gestión de roles y permisos | ALTA | ✅ | Roles `admin`/`usuario` en BD + `requireAuth`/`requireRole`; invitado sin sesión ve solo lo público; sidebar condicional; `verificar:auth` (401/403) |
| RF-03 | Búsqueda por ingredientes | ALTA | ✅ | Chips + orden por ingredientes faltantes + idea del chef (`/search/sugerencias`); `verificar:busqueda` |
| RF-04 | Sugerencia inteligente (API/IA) | ALTA | ✅ | TheMealDB siempre disponible + OpenAI/Gemini opcional con degradación elegante (`fuente: openai\|gemini\|ninguna`); `verificar:busqueda` |
| RF-05 | Detalle de receta | ALTA | ✅ | Ingredientes, pasos, tiempo, dificultad, porciones, imagen, etiquetas, checklist; `verificar:recetas`/`ui-f5` |
| RF-06 | Crear receta propia | ALTA | ✅ | Formulario con validación + ingredientes/pasos dinámicos; `verificar:recetas` |
| RF-07 | Editar con historial de versiones | ALTA | ✅ | Tabla `recipe_versions` + restaurar versión; `verificar:recetas` |
| RF-08 | Eliminar receta (papelera 30 días) | ALTA | ✅ | Borrado lógico `deleted_at` + SweetAlert2 + limpieza programada; `verificar:recetas` |
| RF-09 | Favoritos | ALTA | ✅ | Guardar/consultar/quitar (propias y de TheMealDB); `verificar:recetas` |
| RF-10 | Filtros avanzados | MEDIA | ✅ | **Fase 9:** excluidos + dieta (servidor, cap 40 con aviso `sin_dato`) en Buscar; tiempo/dificultad/texto/etiqueta en Mis recetas; categoría/área en Explorar; `verificar:ui-f5` |
| RF-11 | Historial de búsquedas | MEDIA | ✅ | **Fase 9:** chips «Búsquedas recientes», repetir con un clic y vaciar (localStorage, tope 8); `verificar:ui-f5` |
| RF-12 | Compartir receta | MEDIA | ✅ | Enlace, texto, **imagen PNG** y **PDF** (SweetAlert2); `verificar:ui-f5` |
| RF-13 | 12 temas × 3 modos | ALTA | ✅ | 36 combinaciones con vista previa y persistencia; `verificar:temas` + `verificar:contraste` (36/36 AA) |
| RF-14 | Ajustes de accesibilidad | ALTA | ✅ | Tamaño de fuente, reducir movimiento, alto contraste; `verificar:a11y` |
| RF-15 | Notificaciones toast | ALTA | ✅ | Sistema propio (`exito`/`fracaso`/`informar`) + campana con historial; `verificar:ui-f6` |
| RF-16 | Pop-ups modales glass | ALTA | ✅ | Modal propio + onboarding; `verificar:ui-f6` |
| RF-17 | Alertas SweetAlert2 | ALTA | ✅ | Confirmaciones críticas (eliminar, salir, roles, inactivar…); suites UI |
| RF-18 | Iconografía Font Awesome | ALTA | ✅ | Font Awesome en toda la app (incluye logo propio); lint + suites UI |
| RF-19 | Estructura semántica | ALTA | ✅ | `<header>`, `<aside>`, `<main>`, `<footer>` + landmarks ARIA + SkipLink; `verificar:a11y` 11/11 |
| RF-20 | Modo offline (.exe) | MEDIA | ✅ | API embebida (4731) + SQLite en `%APPDATA%\SazonLab` + assets compilados; `verificar:desktop` 23/23 |
| RF-21 | Exportar/importar JSON | MEDIA | ✅ | En Ajustes → Datos (export/import con validación); `verificar:recetas` |
| RF-22 | Gestión de usuarios (Admin) | ALTA | ✅ | **Fase 9:** panel `/admin` (crear, cambiar rol, inactivar/activar), seed admin, revocación inmediata de sesiones; `verificar:auth` + `verificar:ui-f5` |
| RF-23 | Auditoría de operaciones | ALTA | ✅ | `registrarAuditoria` en login, registro, CRUD y operaciones admin; `verificar:auth` |
| RF-24 | Buscador global | MEDIA | ✅ | Búsqueda desde el header (recetas/ingredientes/etiquetas) con autocomplete; `verificar:busqueda` |
| RF-25 | Onboarding guiado | BAJA | ✅ | Tour de 6 pasos con omitir, repetible desde Ajustes; `verificar:ui-f6` |

**Resultado: 25/25 RF cumplidos (17 ALTA + 7 MEDIA + 1 BAJA).**

---

## 3. Arquitectura

```
recetario/  (monorepo npm workspaces)
├── apps/
│   ├── web/     React 19 + Vite 7 + TailwindCSS 3 → demo web (5173) y renderer Electron
│   │   └── src/ pages/ · components/ (layout semántico) · services/ (api, toast, historial)
│   │            store/ (Zustand: tema, auth, a11y) · themes/ (12 × 3) · styles/ (Liquid Glass)
│   ├── api/     Node.js + Express 4 + SQLite (better-sqlite3) → API (3001 / 4731 en .exe)
│   │   └── src/ routes/ (auth, recipes, search, favorites, admin, chat, correo, nube)
│   │            services/ (mealdb, ia, ollama, chat, mailer, nube, traductor)
│   │            db/ (esquema + seed admin + postgres + estado)
│   ├── desktop/ Electron 44 + electron-builder NSIS → SazónLab-Setup-1.0.0.exe
│   └── landing/ Página oficial (Vite, 5174) + descarga del .exe y del manual en PDF
├── scripts/     12 suites de verificación (Node + Electron + axe-core) y generadores
├── assets/      logo de la marca (SVG fuente)
├── legal/       textos legales compartidos (fuente única)
├── docs/        IEEE · informes por fase · INFORME_FINAL · ACTA_DE_CIERRE
│                · MANUAL_USUARIO (MD+PDF) · evidencias · CHANGELOG
```

| Decisión técnica | Motivo |
|------------------|--------|
| **HashRouter** + `base: './'` | La misma build corre en web (con proxy `/api`) y desde `file://` en Electron, sin configuración extra. |
| **Vite proxy** `/api → :3001` en dev; Express sirve `app/dist` en prod | Misma origen en producción → sin CORS. |
| **Temas por variables CSS** (`data-theme` + `data-mode`) | 12 paletas × 3 modos con vista previa instantánea y persistencia; contraste AA verificado por suite. |
| **SQLite local + PostgreSQL en la nube** | El `.exe` necesita **offline**, así que SQLite queda como caché local; con `DATABASE_URL` la nube es el almacén de verdad y se replica en ambos sentidos (*última escritura gana*). |
| **IA local primero (Ollama)** | La IA del asistente no necesita internet ni claves; si no hay Ollama, se usa OpenAI/Gemini y, si tampoco, un asistente local determinista que **siempre responde**. |
| **Correo: SMTP o Resend, configurado una vez** | El envío real de la recuperación de contraseña se configura en un solo lugar (Ajustes o `.env`) y sirve para todos los usuarios. |
| **API embebida en Electron** (`fork` + `ELECTRON_RUN_AS_NODE`) | El `.exe` no necesita Node instalado; puerto fijo 4731 descubierto por `?apiPort=`; sin procesos huérfanos. |
| **`npmRebuild: false`** | El prebuild oficial de `better-sqlite3` carga en Electron 44 (verificado `ABI-OK`): sin Python/node-gyp en la máquina de build. |
| **TheMealDB + IA opcional** | TheMealDB siempre responde (sin clave); OpenAI/Gemini solo con API key → fallback elegante. |
| **Traducción al español** | El usuario busca en español: se traduce a inglés para TheMealDB y de vuelta (diccionario local → caché → MyMemory). Todo el producto está en español. |
| **Sistemas propios de toast/modal** + SweetAlert2 | Coherentes con el glassmorphism; SweetAlert2 para confirmaciones críticas (requisito del cliente). |
| **axe-core como gate** | Cualquier fallo `serious`/`critical` hace fallar la suite. |

---

## 4. Resultados de la batería de pruebas (cierre)

| Suite | Resultado |
|-------|-----------|
| `npm run lint` / `format` | ✅ 0 errores |
| `npm test` (unitarias `node --test`) | ✅ 23/23 (18 + 2 de correo SMTP real + 3 de nube con PostgreSQL embebido) |
| `verificar:a11y` (axe-core, 11 estados) | ✅ 11/11 |
| `verificar:contraste` (12 temas × 3 modos) | ✅ 36/36 |
| `verificar:temas` (Electron) | ✅ 4/4 |
| `verificar:busqueda` | ✅ 68/68 |
| `verificar:recetas` | ✅ 39/39 |
| `verificar:auth` (incluye panel admin RF-22) | ✅ 41/41 |
| `verificar:cuenta` | ✅ 27/27 |
| `verificar:ui-f5` (incluye RF-10/RF-11, panel RF-22 y menú de cuenta) | ✅ 66/66 |
| `verificar:ui-f6` | ✅ 29/29 |
| `verificar:movil` (responsive: celular/tablet/escritorio) | ✅ 33/33 |
| `verificar:landing` (+ axe 5 estados) | ✅ 38/38 + 5/5 |
| `verificar:desktop` (sobre el `.exe` real) | ✅ 22/22 |
| `build:app` / `build:landing` / `manual:pdf` | ✅ |
| Endpoints (5173, 3001, 5174, robots.txt) | ✅ 200 × 4 |

**≈ 415 comprobaciones automatizadas en verde** (23 unitarias + 12 suites). Reproducir con:
`npm run dev:server` + `npm run dev:app` en una terminal y la batería en otra
(`lint`, `test`, `verificar:*`, `build:*`).

---

## 5. Manual de usuario (resumen)

### Instalación y arranque

```bash
npm install            # Node.js >= 22
npm run dev:server     # API → http://localhost:3001
npm run dev:app        # App → http://localhost:5173
npm run dev:landing    # Landing → http://localhost:5174 (opcional)
```

**Escritorio:** `npm run build:exe` genera `desktop/release/SazónLab-Setup-1.0.0.exe`
(instalador NSIS, también copiado a `landing/public/`). **No requiere Node ni internet:
incluye la API y SQLite local.**

### Uso básico

1. **Entrar**: «Ingresar» → registro o login (o seguir como invitado: se ve el catálogo público).
2. **Buscar**: `Buscar por ingredientes` → pega ingredientes (chips) y ordena por coincidencias;
   también por nombre o **Explorar** por categoría/área. Usa **Filtros avanzados** (excluidos,
   dieta) y repite búsquedas desde **Búsquedas recientes**.
3. **Recetas propias**: `Mis recetas` → crear/editar (con historial de versiones), filtrar por
   tiempo/dificultad/texto/etiqueta, favoritos, papelera (30 días) y selección para el **libro de cocina**.
4. **Compartir**: en detalle de receta → enlace, texto, imagen PNG o PDF.
5. **Personalizar**: `Ajustes` → 12 temas × 3 modos, tamaño de fuente, reducir movimiento,
   tour de bienvenida, exportar/importar JSON, zona de peligro (eliminar cuenta con código al correo).
6. **Mi cuenta**: el menú de cuenta de la **cabecera** (avatar) abre «Mi perfil» (foto, avatar,
   color, nombre y bio), Mis recetas, Favoritos, Administración (si eres admin) y Cerrar sesión.
   «Mi perfil» ya no está en el menú lateral (queda Inicio, Buscar, Mis recetas, Favoritos y Ajustes).
7. **Administrador** (rol `admin`): ítem **Administración** (sidebar y menú de cuenta) → crear
   cuentas, cambiar roles e inactivar/activar usuarios.
8. **Escritorio**: la cabecera y el hero de la landing descargan el instalador `.exe`; en la demo
   web hay un botón «Descargar para Windows» en el inicio y en el pie.

> **Cuenta admin de demo:** `admin@sazonlab.test` / `admin1234`
> (cambiable con `ADMIN_CORREO` / `ADMIN_PASSWORD` en `server/.env`; se crea automáticamente
> si no existe ningún administrador).

### Accesibilidad

- SkipLink al cargar, landmarks ARIA, navegación por teclado y trampas de foco controladas.
- `Ctrl/Cmd + +/-` para tamaño de fuente; opciones en Ajustes → Accesibilidad.
- 36 combinaciones de tema verificadas con contraste **WCAG 2.1 AA**.

---

## 6. Lecciones aprendidas

1. **Planificar el mapeo RF ↔ implementación y verificarlo al final**: 4 RF (02, 10, 11, 22)
   quedaron asignados en el plan pero sin implementar; la revisión de cumplimiento del Sprint 11
   los detectó. *Lección: una tabla de trazabilidad revisada por fase evita sorpresas al cierre.*
2. **Conocer los límites de la API externa antes de diseñar filtros**: TheMealDB no publica
   tiempo/dificultad/dieta en listados → los filtros se repartieron donde el dato existe (detalle
   enriquecido con cap y aviso; recetas propias para tiempo/dificultad), siempre **sin filtrar en
   silencio**.
3. **`requireAuth` que revalida en BD** convierte «inactivar» en una acción real (revoca JWT
   vigentes) sin sistema de tokens revocados: una consulta por petición es un costo despreciable.
4. **Defensa en profundidad para roles**: `requireRole` + re-validación del rol en cada petición
   admin protege contra degradaciones hechas con JWT antiguos.
5. **Suites automatizadas como red de seguridad**: las 14 suites (≈ 400 checks) permitieron
   refactorizar (p. ej. `ejecutar(null, extras)` en Buscar) con confianza; el gate de axe-core
   mantuvo la accesibilidad desde la Fase 6.
6. **Decisiones conservadoras de versión** (React 19, Vite 7, Tailwind 3, Electron fijo) +
   `--ignore-scripts` = instalación reproducible sin toolchain nativa.
7. **El `.exe` autosuficiente** (API embebida + `asarUnpack` + prebuilds) fue la decisión más
   delicada: probarla **sobre el binario real** (suite `verificar:desktop`) evitó entregar un
   instalador sin UI.

---

## 7. Pendientes y recomendaciones futuras

| Pendiente | Impacto | Recomendación |
|-----------|---------|---------------|
| **Code signing** del `.exe` | SmartScreen mostrará «app desconocida» | Comprar certificado EV/OV y firmar en `electron-builder` |
| **`sitemap.xml`** | SEO de la landing cuando haya dominio | Generarlo en el build de landing (el `robots.txt` ya lo referencia) |
| **Contraseña admin de demo** | Credenciales publicadas | En producción: cambiar `ADMIN_PASSWORD` o retirar el seed |
| **PostgreSQL en producción** | La capa ya replica con PostgreSQL (Fase 10), pero sin `DATABASE_URL` todo vive en SQLite local | Definir `DATABASE_URL` (Neon/Supabase) y decidir la cadencia de sincronización automática |
| **Claves de IA / Ollama** | Sin IA externa, el chatbot usa el asistente local determinista | Configurar `OPENAI_API_KEY`/`GEMINI_API_KEY` o instalar Ollama para IA real |
| **Correo real** | Ya implementado (SMTP/Resend + enlace); falta activarlo en producción | Configurar el proveedor en Ajustes → Correo de recuperación (una vez) o en `apps/api/.env` |

---

*Informe generado en la Fase 9 (cierre del proyecto) y ampliado en la Fase 10
(correo real, PostgreSQL en la nube, IA local con chatbot, responsive, manual en
MD/PDF y reorganización de carpetas). Consolidación de los informes
`docs/informes/fase-0.md` … `fase-10.md`.*
