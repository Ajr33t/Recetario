# 🍳 SazónLab — Recetario Inteligente

Aplicación de recetario digital que sugiere recetas según los ingredientes disponibles, permite crear recetas propias, compartirlas como **imagen o PDF**, generar un **libro de cocina** y personalizar la experiencia con **12 temas × 3 modos** (claro, oscuro, alto contraste). Diseño **Liquid Glass** y accesibilidad **WCAG 2.1 AA verificada con axe-core**.

> 📄 Especificación de requisitos: [`docs/IEEE_Recetario_Inteligente.md`](docs/IEEE_Recetario_Inteligente.md)
> 📈 Estado por fase: [`docs/CHANGELOG.md`](docs/CHANGELOG.md) · Informes: [`docs/informes/`](docs/informes/)
> 🏁 **Informe final (25/25 RF):** [`docs/INFORME_FINAL.md`](docs/INFORME_FINAL.md) · **Acta de cierre:** [`docs/ACTA_DE_CIERRE.md`](docs/ACTA_DE_CIERRE.md)

## 📦 Entregables

- 📄 Documento IEEE (`docs/IEEE_Recetario_Inteligente.md`)
- 🌐 Demo web funcional (`app/`)
- 🖥️ Página web oficial / landing (`landing/`)
- 💻 Aplicación de escritorio `.exe` (`desktop/`) → **`SazónLab-Setup-1.0.0.exe` en la raíz de la carpeta** (copia visible; también en `desktop/release/` y en `landing/public/` para la descarga web)

> El instalador pesa ~124,7 MB, por eso **no se versiona en Git** (límite de 100 MB): se regenera con `npm run build:exe` y se deja en la raíz de la carpeta del proyecto.

## 🛠️ Stack

- **Frontend:** React 19 + Vite 7 + TailwindCSS 3 (glassmorphism)
- **Estado:** Zustand
- **Backend:** Node.js + Express 4 (proxy de APIs + auth JWT/bcrypt)
- **APIs:** TheMealDB (fallback gratuito) + OpenAI/Gemini (sugerencia IA, opcional)
- **BD:** SQLite local (Electron y demo) + PostgreSQL opcional vía `DATABASE_URL`
- **Escritorio:** Electron 44 + electron-builder (NSIS)
- **Iconos:** Font Awesome · **Alertas:** SweetAlert2 · **Toasts/modales:** sistema propio

## 🚀 Instalación

```bash
# Requisitos: Node.js >= 22
git clone <url>
cd recetario
npm install

# Demo web (2 terminales)
npm run dev:server   # API en http://localhost:3001
npm run dev:app      # Web en http://localhost:5173

# Landing (opcional)
npm run dev:landing  # http://localhost:5174

# Electron (requiere dev:server y dev:app corriendo)
npm run dev:desktop

# Empaquetar .exe (compila la UI, sincroniza server+renderer y arma el NSIS)
npm run build:exe
```

> 🛡️ **Cuenta admin de demo** (se crea sola si no hay ningún administrador):
> `admin@sazonlab.test` / `SazonLab-Admin-2026` — cámbiala con `ADMIN_CORREO` / `ADMIN_PASSWORD`
> en `server/.env` antes de un despliegue real. Detalle en [`docs/INFORME_FINAL.md`](docs/INFORME_FINAL.md).

## 📁 Estructura

```
recetario/
├── app/            # React + Vite (demo web + renderer Electron)
│   └── src/
│       ├── components/   # layout, ui (ToastHost, Modal), onboarding, tema
│       ├── pages/        # rutas de la app
│       ├── services/     # api, toast, exportarReceta
│       ├── store/        # Zustand (tema, auth, a11y)
│       ├── styles/       # index.css (Liquid Glass + @media print)
│       └── themes/       # 12 paletas × 3 modos
├── server/         # Node.js + Express + SQLite
├── desktop/        # Electron + electron-builder
├── landing/        # Página web oficial
├── scripts/        # Suites de verificación (Node + Electron)
├── docs/
│   ├── informes/   # Informe por fase (fase-0 … fase-9)
│   ├── evidencias/ # Contraste, axe-core, checklist WCAG, capturas
│   └── CHANGELOG.md
└── README.md
```

## 📜 Scripts

### Desarrollo y build

| Script                        | Descripción                                                   |
| ----------------------------- | ------------------------------------------------------------- |
| `npm run dev:app`             | Demo web (Vite, puerto 5173)                                  |
| `npm run dev:server`          | API Express (puerto 3001)                                     |
| `npm run dev:landing`         | Landing oficial (puerto 5174)                                 |
| `npm run dev:desktop`         | Electron en modo desarrollo                                   |
| `npm run build:app`           | Build de producción de la demo                                |
| `npm run build:landing`       | Build de la landing                                           |
| `npm run build:exe`           | Build web + sincroniza + genera el `.exe` (NSIS) y lo copia   |
| `npm run sincronizar:desktop` | Copia `app/dist` y `server/src` a `desktop/` (para el `.exe`) |
| `npm run copiar:exe`          | Copia el `.exe` a la raíz del proyecto y a `landing/public/`  |
| `npm run lint` / `lint:fix`   | ESLint                                                        |
| `npm run format`              | Prettier                                                      |

### Verificación (batería por fase)

| Script                        | Descripción                                             |
| ----------------------------- | ------------------------------------------------------- |
| `npm test`                    | Pruebas unitarias (`node --test`, sin dependencias)     |
| `npm run verificar:a11y`      | axe-core WCAG 2.1 AA sobre 11 estados de la UI          |
| `npm run verificar:contraste` | Contraste WCAG en 12 temas × 3 modos (36 combinaciones) |
| `npm run verificar:temas`     | Aplicación de temas/modos/a11y en Electron              |
| `npm run verificar:auth`      | Registro, login, JWT, roles, panel admin, auditoría     |
| `npm run verificar:busqueda`  | Búsqueda, filtros, traducción y cobertura de áreas      |
| `npm run verificar:recetas`   | CRUD, versiones, papelera, favoritos, export/import     |
| `npm run verificar:ui-f5`     | UI Fase 5: JSON, libro, compartir, filtros e historial  |
| `npm run verificar:ui-f6`     | UI Fase 6: tour, campana de notificaciones, toasts      |
| `npm run verificar:landing`   | Landing oficial: secciones, legales, SEO, axe           |
| `npm run verificar:cuenta`    | Eliminar cuenta con código al correo (API + UI + axe)   |
| `npm run verificar:desktop`   | `.exe` empaquetado: API embebida, SQLite local y UI     |
| `npm run logo`                | Regenera el PNG512 del logo (Electron, sin deps)        |
| `npm run capturas`            | Capturas de evidencia (galería de temas)                |

> Las suites UI necesitan la demo (`dev:server` + `dev:app`) corriendo; las de red necesitan internet para TheMealDB.

## 🎨 Características

- 🔍 Búsqueda por ingredientes con sugerencia IA (OpenAI/Gemini opcional)
- 🕘 **Historial de búsquedas**: «Búsquedas recientes» con repetición en un clic y vaciado (RF-11)
- 🗂️ **Filtros avanzados**: ingredientes excluidos y dieta (vegetariana/vegana) en Buscar; tiempo, dificultad, texto y etiqueta en Mis recetas; categorías y solo las **áreas con recetas reales** en Explorar (RF-10)
- 🛡️ **Panel de administración** (`/admin`, solo rol admin): crear cuentas, cambiar roles e inactivar/activar usuarios con revocación inmediata de sesiones (RF-02/RF-22)
- 👤 **Menú de cuenta en la cabecera** (navbar): avatar del usuario (foto o icono con su color), **Mi perfil**, Mis recetas, Favoritos, Administración y Cerrar sesión — «Mi perfil» ya no está en el menú lateral
- 💾 **Instalador `.exe` visible**: descarga directa desde la cabecera y el hero de la landing, y CTA «Descargar para Windows» en el inicio y el pie de la demo web
- 📝 CRUD de recetas propias con **historial de versiones restaurables** y **papelera** (30 días)
- ❤️ Favoritos (propias y de TheMealDB) e importación a tu colección
- 📤 **Compartir**: enlace, receta como texto, **imagen PNG** y **PDF** con estilos y foto
- 📚 **Libro de cocina**: portada, **índice con número de página**, recetas por página y **página fija de medidas**
- 📏 Página `/medidas`: conversor + tablas de equivalencias español ↔ inglés
- ✅ Checklist de ingredientes («Te faltan…» se actualiza al marcar lo que ya tienes)
- 🎨 12 temas × 3 modos (36 combinaciones) con persistencia
- ♿ **WCAG 2.1 AA**: axe-core 11/11 estados, contraste 36/36, SkipLink, trampas de foco, `aria-live`
- 🔔 **Notificaciones**: toasts glass propios + campana con historial en la cabecera
- 🧭 **Tour de bienvenida** de 6 pasos (repetible desde Ajustes)
- 🧩 Estructura semántica (`<header>`, `<aside>`, `<main>`, `<footer>`) + ARIA
- 🌐 **Landing oficial** con captura real, «¿Cómo funciona?», SEO (JSON-LD/robots) y **páginas legales** (Privacidad/Términos) en app y landing
- ⚖️ **Legales con normativa colombiana** en fuente única compartida: Ley 1581/2012, Ley 1480/2011 + 2439/2024, Ley 1755/2015, Ley 527/1999, Ley 1712/2014, Ley 1273/2009, Constitución (hábeas data) y SIC como autoridad de control
- 🗑️ **Eliminar cuenta** desde la «Zona de peligro» del perfil con **código de confirmación de 6 dígitos enviado al correo** (SweetAlert2 en 3 pasos)
- 🎨 **Logo propio** de SazónLab (SVG + favicon): **olla con vapor** en degradado ámbar/naranja, e icono personalizado en el `.exe`
- 💎 Estilo Liquid Glass en toda la interfaz
- 💻 **Modo offline real en el `.exe`**: API de Express embebida (puerto 4731), **SQLite local en `%APPDATA%\SazonLab`** y todos los assets compilados (CSS, Font Awesome, SweetAlert2, JS) dentro del instalador — sin instalar Node ni internet

## 📄 Licencia

MIT

## 👥 Créditos

- Alejandro Rua Toro
- José Germán Estrada Clavijo
- SENA — Centro de Procesos Industriales y Construcción
