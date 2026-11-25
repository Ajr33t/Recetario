# Checklist QA por funcionalidad — Encargo (9 puntos)

La batería se ejecuta con `npm run lint`, `npm test` y los scripts `verificar:*`.
Estado registrado el 25/11/2026.

## 1. Lista de pedidos (RF-32)

- [x] Alta de pedido con recetas y cantidades.
- [x] Edición de total, método de pago y notas.
- [x] Marcar como completado (una sola vez) y eliminar (incluso completado).
- [x] Filtros por estado y por rango de fechas.
- [x] Contador de activos en tarjetas y badge del sidebar.
- [x] Estados vacío, carga y error.
- [x] **Solo chef**: admin recibe 403 en API; menú y ruta bloqueados para admin/usuario.
- [x] QA: `qa-encargo.cjs` 26/26 + `npm run verificar:pedidos` 14/14.

## 2. Descarga de cualquier receta (RF-33)

- [x] Menú desplegable «Descargar» con PDF e imagen en recetas propias, importadas y de IA.
- [x] PDF abre impresión con la receta sola (incluye leyenda de alérgenos).
- [x] PNG generado por canvas con el mismo diseño.
- [x] QA: `verificar:carta` comprueba el menú y sus dos opciones.

## 3. Rol Chef/Restaurante (RF-34)

- [x] CHECK de rol ampliado con migración segura (conserva usuarios y preferencias).
- [x] Admin crea/asigna el rol (alta y cambio).
- [x] Panel propio con recetas, carta, pedidos, descargas y QR.
- [x] Admin/usuario/invitado sin acceso a pedidos ni panel.
- [x] QA: `test-migracion.mjs` 8/8 + `verificar:pedidos` + `verificar:carta`.

## 4. Alérgenos (RF-35)

- [x] Catálogo de 12 alérgenos con iconos y etiquetas.
- [x] Precarga desde ingredientes en recetas y platos (editable).
- [x] Leyenda en ficha, carta digital y exportes PDF/imagen.
- [x] Composición visible en platos y carta.
- [x] Filtro del comensal vía `?excluir_alergenos=` que oculta platos.
- [x] QA: precarga gluten/huevo verificada por API; ocultar/restaurar verificado en UI.

## 5. Reestructuración IEEE 830-1998

- [x] SRS completo: RS, RF, RNF, CU, modelo de dominio, diagramas, trazabilidad y referencias.
- [x] `docs/IEEE_Recetario_Inteligente.md` versión 2.0.

## 6. Personalización de carta (RF-36)

- [x] Modal con colores, orientación, tamaño, tipografía, versión y organización.
- [x] Logo + nombre del establecimiento; alérgenos y composición.
- [x] Vista previa en vivo.
- [x] Export PDF (impresión) e imagen (canvas) con las opciones aplicadas.
- [x] Persistencia en `user_preferences.preferences_json`.
- [x] QA: `verificar:carta` (controles, vista previa y exportación).

## 7. QR (RF-37)

- [x] Color de primer plano/fondo, tamaño, logo central, marco y etiqueta.
- [x] PNG, SVG y PDF.
- [x] La URL del QR abre la carta digital con las mismas opciones.
- [x] Dependencia única añadida: `qrcode` (offline).
- [x] QA: vista previa y formatos verificados en `verificar:carta`.

## 8. Rediseño visual (RF-38)

- [x] Design system (tokens, glass, botones, chips) y microinteracciones.
- [x] Estados vacíos/carga/error en pedidos, carta y panel.
- [x] Contraste AA (36 combinaciones) y axe sin violaciones serious/critical.
- [x] Controles táctiles ≥ 40 px y responsive (móvil/tablet/escritorio).
- [x] Medidas disponible en el menú lateral de todos los roles.
- [x] QA: `verificar:contraste`, `verificar:movil`, `verificar:a11y`.

## 9. Liquid Glass (RF-39)

- [x] Interruptor en Ajustes > Apariencia.
- [x] Activado por defecto, persistente tras recargar.
- [x] Al desactivarlo: `data-glass="off"` y `backdrop-filter: none` (superficies sólidas legibles).
- [x] QA: `npm run verificar:glass` 7/7.

## Regresión y entregables

- [x] 14 suites `verificar:*` pasan (contraste, temas, auth, búsqueda, recetas, pedidos, carta, glass, ui-f5, ui-f6, landing, cuenta, a11y, movil).
- [x] `npm test`: 23/23; `npm run lint`: 0 errores.
- [x] `verificar:desktop`: API embebida, SQLite local y UI compilada OK.
- [x] `.exe` e instalador reconstruidos y copiados (web + landing + release).
- [x] Guía rápida y checklist actualizados.
