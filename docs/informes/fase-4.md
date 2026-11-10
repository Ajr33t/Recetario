# FASE 4 — Búsqueda de recetas (TheMealDB) + sugerencias con IA

**Proyecto:** Recetario Inteligente — SazónLab
**Fecha:** 10/11/2026
**Estado:** ✅ Completada — pendiente de aprobación

---

## 1. Objetivo

Conectar la búsqueda de recetas a **TheMealDB** en sus tres modos (ingredientes, nombre, explorar), añadir **detalle real de receta**, **autocompletado** de ingredientes y recetas, y **sugerencias con IA** (OpenAI → Gemini → respaldo sin IA) que siempre funciona.

---

## 2. Actividades realizadas

| N° | Actividad | Resultado |
|----|-----------|-----------|
| 4.1 | `services/mealdb.js`: cliente con caché en memoria (TTL 10 min), `normalizar()` (ingredientes/medidas/instrucciones/etiquetas), búsqueda por nombre, detalle, aleatorias, filtros, explorar, autocompletado | ✅ |
| 4.2 | **Fix multi-ingrediente**: `filter.php?i=a,b` de TheMealDB devuelve `null` (roto) → se consulta ingrediente por ingrediente y se **fusiona por frecuencia** (las recetas que usan más de tus ingredientes van primero, `coincidencias` visible, tope 12) | ✅ |
| 4.3 | `services/ia.js`: `ideasDelChef()` — OpenAI `gpt-4o-mini` → Gemini `gemini-1.5-flash` → `fuente:"ninguna"`; timeout 20 s, sin claves igual responde la API | ✅ |
| 4.4 | `routes/search.js` montado en `/api/search`: `GET /` (nombre), `/ingredientes`, `/sugerencias` (recetas + ideas), `/filtros`, `/categorias?c|a`, `/destacadas?n`, `/autocomplete?t&tipo`, `/receta/:id`; historial en `search_history` si hay token válido | ✅ |
| 4.5 | **Autocompletado**: `CampoAutocomplete.jsx` (patrón ARIA combobox, debounce 250 ms, ↑↓/Enter/Escape, clic fuera cierra); ingredientes → chip, recetas → navega al detalle | ✅ |
| 4.6 | **Buscar.jsx** conectada: 3 modos (ingredientes/nombre/explorar), chips de ingredientes, banner "Idea del chef" con fuente IA, grid de resultados con chip de coincidencias, estados vacío/error/cargando | ✅ |
| 4.7 | **RecetaDetalle.jsx** real: imagen, categoría/área/etiquetas, ingredientes con medidas, preparación numerada, video/fuente original, estados 404/carga/error | ✅ |
| 4.8 | **Inicio**: destacadas reales desde `/search/destacadas?n=3` con respaldo estático si falla la API | ✅ |
| 4.9 | **Todo siempre en español** (requisito del cliente): `services/diccionario.js` (diccionario culinario EN→ES local con ~250 términos de categorías, áreas, ingredientes y unidades) + `services/traductor.js` (diccionario → caché permanente en SQLite `traducciones` → Google translate → MyMemory con troceado) | ✅ |
| 4.10 | **Búsqueda en español**: el usuario escribe "pollo, tomate" → se traduce a inglés para TheMealDB (`aIngles` + traducción inversa desde la caché para lo traducido en línea, p. ej. "Afgano"→"Afghan"); la respuesta (títulos, categorías, áreas, ingredientes con medidas, instrucciones) vuelve traducida | ✅ |
| 4.11 | `scripts/verificar-busqueda.mjs` → `npm run verificar:busqueda` | ✅ **41/41** |

---

## 3. Entregables generados

```
server/src/services/mealdb.js            # cliente TheMealDB + caché + fusión multi-ingrediente + autocomplete
server/src/services/ia.js                # OpenAI → Gemini → ninguna (idea del chef)
server/src/services/diccionario.js       # diccionario culinario EN→ES (~250 términos) + inverso ES→EN
server/src/services/traductor.js         # diccionario → caché SQLite → Google → MyMemory (troceado)
server/src/routes/search.js              # 8 endpoints /api/search (entrada y salida en español)
app/src/components/search/CampoAutocomplete.jsx   # combobox accesible
app/src/pages/Buscar.jsx                 # 3 modos reales + idea del chef
app/src/pages/RecetaDetalle.jsx          # detalle real TheMealDB (en español)
app/src/pages/Home.jsx                   # destacadas reales (con respaldo)
scripts/verificar-busqueda.mjs           # 41 comprobaciones (incluye 8 de español)
docs/informes/fase-4.md                  # este informe
```

---

## 4. Decisiones técnicas

1. **TheMealDB sin clave** (`/api/json/v1/1/`): público, estable; caché 10 min para no saturarlo.
2. **Filtro multi-ingrediente roto**: se fusionan resultados individuales por frecuencia → mejor UX que el filtro oficial (además el oficial ignora ingredientes de más).
3. **Áreas**: `list.php?a=list` devuelve 195 (incluye países) — se acepta tal cual es la API.
4. **IA solo para texto**: las ideas del chef son sugerencias de plato; **las recetas siempre vienen de TheMealDB** (verificables). Sin `OPENAI_API_KEY`/`GEMINI_API_KEY` la búsqueda funciona igualmente (`fuente:"ninguna"`).
5. **Ingredientes en inglés**: TheMealDB es anglocéntrico → se resolvió con la **capa en español** completa (ver siguiente punto) en lugar de pedirle al usuario que escriba en inglés.
6. **Todo en español** (requisito del cliente): el diccionario local traduce sin internet las ~250 palabras comunes; lo demás va a Google translate (sin clave) con **enfriamiento de 60 s tras un 429** y respaldo a MyMemory **troceando textos largos a ≤450 caracteres** (su límite real). Cada traducción queda **cacheada en SQLite** de forma permanente: solo se traduce una vez. Si ambos proveedores fallan, se conserva el texto original para no romper la búsqueda.
7. **Historial**: solo se guarda si el usuario envía JWT; sin token la búsqueda es anónima (no rompe 401 para invitados).

---

## 5. Evidencias de verificación

| Verificación | Resultado |
|--------------|-----------|
| `npm run lint` | ✅ 0 errores |
| `npm run format` | ✅ aplicado |
| `npm run build:app` | ✅ |
| `npm run build:landing` | ✅ |
| `npm run verificar:contraste` | ✅ 36/36 |
| `npm run verificar:temas` | ✅ 4/4 |
| `npm run verificar:auth` | ✅ 27/27 (regresión) |
| `npm run verificar:busqueda` | ✅ **41/41** (incluye 8 comprobaciones de español: búsqueda `q=pollo`, filtros en español, detalle/ingredientes/instrucciones traducidos, autocompletado parcial en español) |
| `GET localhost:5173` (demo) | ✅ 200 |
| `GET localhost:3001/api/health` | ✅ 200 |

---

## 6. Pendientes registrados

- **Fase 5**: favoritos + recetas propias con ingredientes faltantes; exportar recetas a **PDF tipo libro de cocina** (idea del cliente → Fase 5/7).
- **Fase 7**: páginas legales Privacidad/Términos.
