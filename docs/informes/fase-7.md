# Informe de Fase 7 — Landing page oficial + páginas legales

**Fecha:** 2026-11-11
**Estado:** ✅ Completada
**Sprint IEEE equivalente:** 10 (entregable «Landing page» del Hito 11)

---

## 1. Objetivo

Completar el entregable **(C) página web oficial del producto** del IEEE:

- Landing oficial con contenido completo (Fase 1 dejó solo la estructura base).
- Enlaces reales: demo web y descarga del `.exe`.
- **Páginas legales** (Privacidad / Términos), pendiente registrado desde la Fase 5:
  enlaces del pie de la app que apuntaban a `href="#"`.
- SEO básico (robots.txt, JSON-LD, Open Graph) y verificación automática.

---

## 2. Actividades realizadas

| # | Actividad | Archivos |
|---|-----------|----------|
| 1 | **Landing reescrita**: hero con **captura real** de la app (tema Océano), sección **«¿Cómo funciona?»** (3 pasos), 6 funciones, descarga, enlaces reales (demo `http://localhost:5173/`, `.exe` → `./SazónLab-Setup-1.0.0.exe`), cero enlaces `href="#"` | `landing/src/App.jsx` |
| 2 | **Vistas legales por hash** en la landing (`#/privacidad`, `#/terminos`): sin dependencias de router, texto idéntico al de la app, navegación desde pie y cabecera | `landing/src/App.jsx` |
| 3 | **Páginas legales en la app**: componente único `Legal` con dos documentos (datos recolectados, almacenamiento local/SQLite, terceros TheMealDB/IA, derechos; términos: uso, propiedad, aviso de IA, responsabilidad) | `app/src/pages/Legal.jsx` |
| 4 | **Rutas** `/privacidad` y `/terminos` en la app | `app/src/App.jsx` |
| 5 | **Pie de la app sin enlaces muertos**: Términos/Privacidad pasan de `<a href="#">` a botones con `navigate()` (patrón HashRouter ya usado en Medidas) | `app/src/components/layout/AppFooter.jsx` |
| 6 | **SEO**: `robots.txt`, meta description/author/robots/canonical, Open Graph + Twitter Card y **JSON-LD** (`SoftwareApplication` con `inLanguage: es`) | `landing/public/robots.txt`, `landing/index.html` |
| 7 | **Captura real** copiada a la landing (`captura-app.png`, 380 KB) dentro del marco tipo navegador | `landing/public/captura-app.png` |
| 8 | **Clase `.surface-section`** añadida al CSS de la landing (no existía) y **`--primary` oscurecido** a `3 105 161` (sky-700): el sky-600 daba 4.1:1 con blanco y axe lo marcaba como `serious` | `landing/src/styles/index.css` |
| 9 | **Suite** `npm run verificar:landing` (`scripts/verificar-landing.cjs`, **35 checks + axe en 5 estados**): semántica, secciones, enlaces reales, vistas legales hash, SEO, páginas legales de la app y navegación del pie; genera capturas de evidencia | `scripts/verificar-landing.cjs` |

---

## 3. Decisiones de diseño

1. **Un solo componente legal con dos documentos.** El texto de Privacidad/Términos
   vive en `Legal.jsx` (app) y se duplica en la landing: los dos proyectos se
   construyen por separado (sin dependencias cruzadas) y ambos deben poder
   publicarse de forma independiente. La suite verifica que las dos
   implementaciones rendericen el contenido esperado.
2. **Legales en la landing por hash, sin react-router.** `#/privacidad` y
   `#/terminos` se resuelven con `hashchange`; el resto de anclas (`#funciones`,
   `#descarga`) siguen funcionando como anclas normales — sin añadir una
   dependencia a un proyecto que no la tenía (decisión conservadora).
3. **En la app, botones con `navigate()` en el pie.** Con HashRouter, un
   `<a href="#/privacidad">` competiría con el router; los botones ya eran el
   patrón usado para «Accesibilidad» y «Medidas».
4. **Descarga apunta al artefacto de la Fase 8.** `./SazónLab-Setup-1.0.0.exe`
   será copiado a `landing/public/` cuando electron-builder genere el
   instalador (Fase 8); el enlace ya está cableado y verificado en la suite.
5. **axe como puerta también en la landing.** Cualquier violación
   `serious`/`critical` en los 5 estados (inicio, privacidad, términos de la
   landing + ambas páginas de la app) hace fallar `verificar:landing`. Se
   detectó y corrigió el contraste del primario en esta misma fase.

---

## 4. Requisitos cubiertos

| RF/RNF | Requisito | Evidencia |
|--------|-----------|-----------|
| Entregable (C) | Página web oficial (landing) | `landing/` completo + `build:landing` |
| Hito 11 (Sprint 10) | Landing page entregada | `verificar:landing` 35/35 |
| — | Páginas legales (pendiente Fase 5) | `/privacidad`, `/terminos` en app + `#/…` en landing |
| — | SEO básico | robots.txt + JSON-LD + OG verificados por la suite |
| — | Enlaces del pie vivos | test de navegación real en la suite |

### Cumplimiento de requisitos obligatorios del cliente

| Requisito | Estado | Evidencia |
|-----------|--------|-----------|
| Electron | ✅ | `verificar:landing` corre con Electron |
| 12 temas × claro/oscuro/alto contraste | ✅ | La app (donde viven los temas) pasa `verificar:temas` + `verificar:contraste` 36/36 |
| Estructura semántica (header, sidebar, footer, contenido) | ✅ | Landing: `<header>/<main>/<footer>` verificados; app: landmarks intactos (axe) |
| Apartado visual siempre en glassmode | ✅ | Landing Liquid Glass (glass-card, glass, chips) |
| Font Awesome | ✅ | Iconos en toda la landing |
| SweetAlert2 / notificaciones / popups | ✅ | En la app (Fases 5–6), sin regresiones: `verificar:ui-f5/f6` |
| Todo en español | ✅ | Textos legales, SEO (`inLanguage: es`, `og:locale`), UI |

---

## 5. Verificación

| Comando | Resultado |
|---------|-----------|
| `npm run verificar:landing` | ✅ 35/35 + axe 5/5 estados sin serious/critical |
| `npm run lint` / `format` | ✅ 0 errores |
| `npm test` | ✅ 18/18 |
| `npm run verificar:a11y` | ✅ 11/11 |
| `npm run verificar:ui-f6` | ✅ 29/29 |
| `npm run verificar:ui-f5` | ✅ 37/37 |
| `npm run verificar:contraste` | ✅ 36/36 |
| `npm run verificar:temas` | ✅ 4/4 |
| `npm run verificar:busqueda` | ✅ 68/68 |
| `npm run verificar:recetas` | ✅ 39/39 |
| `npm run verificar:auth` | ✅ 27/27 |
| `npm run build:app` / `build:landing` | ✅ |
| Demo `:5173` / API `:3001` / landing `:5174` / robots.txt | ✅ 200 / 200 / 200 / 200 |

**Evidencias:** `docs/evidencias/landing-01-inicio.png`,
`landing-02-privacidad.png`, `app-05-terminos.png`.

---

## 6. Pendientes registrados

- Copiar `SazónLab-Setup-1.0.0.exe` a `landing/public/` → **Fase 8** (el enlace
  ya apunta ahí).
- `sitemap.xml` real cuando exista dominio de publicación (el robots.txt ya lo
  referencia).
