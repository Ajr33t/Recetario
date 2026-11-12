# 🍳 SazónLab — Recetario Inteligente

Aplicación de recetario digital que sugiere recetas según los ingredientes disponibles, permite crear recetas propias, compartirlas como **imagen o PDF**, generar un **libro de cocina** y personalizar la experiencia con **12 temas × 3 modos** (claro, oscuro, alto contraste). Diseño **Liquid Glass** y accesibilidad **WCAG 2.1 AA verificada con axe-core**.

> 📄 Especificación de requisitos: [`docs/IEEE_Recetario_Inteligente.md`](docs/IEEE_Recetario_Inteligente.md)
> 📈 Estado por fase: [`docs/CHANGELOG.md`](docs/CHANGELOG.md) · Informes: [`docs/informes/`](docs/informes/)

## 📦 Entregables

- 📄 Documento IEEE (`docs/IEEE_Recetario_Inteligente.md`)
- 🌐 Demo web funcional (`app/`)
- 🖥️ Página web oficial / landing (`landing/`)
- 💻 Aplicación de escritorio `.exe` (`desktop/`)

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

# Empaquetar .exe
npm run build:exe
```

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

| Script                      | Descripción                              |
| --------------------------- | ---------------------------------------- |
| `npm run dev:app`           | Demo web (Vite, puerto 5173)             |
| `npm run dev:server`        | API Express (puerto 3001)                |
| `npm run dev:landing`       | Landing oficial (puerto 5174)            |
| `npm run dev:desktop`       | Electron en modo desarrollo              |
| `npm run build:app`         | Build de producción de la demo           |
| `npm run build:landing`     | Build de la landing                      |
| `npm run build:exe`         | Build web + generación del `.exe` (NSIS) |
| `npm run lint` / `lint:fix` | ESLint                                   |
| `npm run format`            | Prettier                                 |

### Verificación (batería por fase)

| Script                        | Descripción                                             |
| ----------------------------- | ------------------------------------------------------- |
| `npm test`                    | Pruebas unitarias (`node --test`, sin dependencias)     |
| `npm run verificar:a11y`      | axe-core WCAG 2.1 AA sobre 11 estados de la UI          |
| `npm run verificar:contraste` | Contraste WCAG en 12 temas × 3 modos (36 combinaciones) |
| `npm run verificar:temas`     | Aplicación de temas/modos/a11y en Electron              |
| `npm run verificar:auth`      | Registro, login, JWT, roles, auditoría                  |
| `npm run verificar:busqueda`  | Búsqueda, filtros, traducción y cobertura de áreas      |
| `npm run verificar:recetas`   | CRUD, versiones, papelera, favoritos, export/import     |
| `npm run verificar:ui-f5`     | UI Fase 5: JSON, libro, compartir, checklist, medidas   |
| `npm run verificar:ui-f6`     | UI Fase 6: tour, campana de notificaciones, toasts      |
| `npm run verificar:landing`   | Landing oficial: secciones, legales, SEO, axe           |
| `npm run verificar:cuenta`    | Eliminar cuenta con código al correo (API + UI + axe)   |
| `npm run logo`                | Regenera el PNG512 del logo (Electron, sin deps)        |
| `npm run capturas`            | Capturas de evidencia (galería de temas)                |

> Las suites UI necesitan la demo (`dev:server` + `dev:app`) corriendo; las de red necesitan internet para TheMealDB.

## 🎨 Características

- 🔍 Búsqueda por ingredientes con sugerencia IA (OpenAI/Gemini opcional) e historial
- 🗂️ Filtros de Explorar con categorías y solo las **áreas con recetas reales**
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
- 🎨 **Logo propio** de SazónLab (SVG + favicon) e icono personalizado en el `.exe`
- 💎 Estilo Liquid Glass en toda la interfaz
- 💻 Versión `.exe` con modo offline básico (SQLite)

## 📄 Licencia

MIT

## 👥 Créditos

- Alejandro Rua Toro
- José Germán Estrada Clavijo
- SENA — Centro de Procesos Industriales y Construcción
