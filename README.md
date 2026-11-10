# 🍳 SazónLab — Recetario Inteligente

Aplicación de recetario digital que sugiere recetas según los ingredientes disponibles, permite crear recetas propias y personalizar la experiencia con **12 temas × 3 modos** (claro, oscuro, alto contraste). Diseño **Liquid Glass** y accesibilidad **WCAG 2.1 AA**.

> 📄 Especificación de requisitos: [`docs/IEEE_Recetario_Inteligente.md`](docs/IEEE_Recetario_Inteligente.md)

## 📦 Entregables

- 📄 Documento IEEE (`docs/IEEE_Recetario_Inteligente.md`)
- 🌐 Demo web funcional (`app/`)
- 🖥️ Página web oficial / landing (`landing/`)
- 💻 Aplicación de escritorio `.exe` (`desktop/`)

## 🛠️ Stack

- **Frontend:** React 19 + Vite 7 + TailwindCSS 3 (glassmorphism)
- **Estado:** Zustand
- **Backend:** Node.js + Express 4 (proxy de APIs + auth)
- **APIs:** TheMealDB (fallback gratuito) + OpenAI/Gemini (sugerencia IA, opcional)
- **BD:** SQLite local (Electron y demo) + PostgreSQL opcional vía `DATABASE_URL`
- **Escritorio:** Electron 44 + electron-builder (NSIS)
- **Iconos:** Font Awesome · **Alertas:** SweetAlert2

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
├── app/          # React + Vite (demo web + renderer Electron)
├── server/       # Node.js + Express
├── desktop/      # Electron + electron-builder
├── landing/      # Página web oficial
├── docs/         # IEEE, informes de fase, changelog
└── README.md
```

## 📜 Scripts

| Script                      | Descripción                              |
| --------------------------- | ---------------------------------------- |
| `npm run dev:app`           | Demo web (Vite, puerto 5173)             |
| `npm run dev:server`        | API Express (puerto 3001)                |
| `npm run dev:landing`       | Landing oficial (puerto 5174)            |
| `npm run dev:desktop`       | Electron en modo desarrollo              |
| `npm run build:app`         | Build de producción de la demo           |
| `npm run build:exe`         | Build web + generación del `.exe` (NSIS) |
| `npm run lint` / `lint:fix` | ESLint                                   |
| `npm run format`            | Prettier                                 |

## 🎨 Características

- 🔍 Búsqueda por ingredientes con sugerencia IA
- 📝 CRUD de recetas propias (historial de versiones + papelera 30 días)
- ❤️ Favoritos e historial de búsquedas
- 🎨 12 temas × 3 modos (36 combinaciones) con persistencia
- ♿ Accesibilidad WCAG 2.1 AA + modo alto contraste (AAA en texto)
- 🧩 Estructura semántica (`<header>`, `<aside>`, `<main>`, `<footer>`) + ARIA
- 🔔 Notificaciones toast + pop-ups modales + SweetAlert2
- 💎 Estilo Liquid Glass en toda la interfaz
- 💻 Versión `.exe` con modo offline básico (SQLite)

## 📄 Licencia

MIT

## 👥 Créditos

- Alejandro Rua Toro
- José Germán Estrada Clavijo
- SENA — Centro de Procesos Industriales y Construcción
