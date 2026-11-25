# Guía rápida — SazónLab (nuevas funcionalidades)

## 1. Accesos por rol

| Rol | Menú lateral | Qué puede hacer |
| --- | --- | --- |
| Invitado | Inicio, Asistente, **Medidas y equivalencias**, Ajustes | Buscar, ver recetas públicas, usar el chat flotante, consultar medidas. |
| Usuario | + Buscar, Mis recetas, Favoritos | Crear/editar recetas, favoritos, descargar recetas en PDF/imagen. |
| Admin | + Administración | Crear usuarios, **asignar rol Chef/Restaurante**, cambiar roles, restablecer contraseñas y consultar auditoría. **No ve Pedidos ni Panel del chef**. |
| Chef | + **Panel del chef**, **Pedidos** | Gestionar su carta, precios, alérgenos, pedidos, QR y exportaciones. |

> El **chat flotante** (botón abajo a la derecha) es una conversación independiente: ya no lleva a la página del Asistente.

## 2. Preparar un chef (solo admin)

1. Entrar como `admin@sazonlab.test` / `admin1234`.
2. **Administración → Crear cuenta**: nombre, correo, contraseña (mín. 8 caracteres) y rol **Chef / Restaurante**.
3. También se puede cambiar el rol de un usuario existente en la lista de usuarios.

## 3. Panel del chef

1. Menú lateral → **Panel del chef**.
2. **Agregar plato**: elegir una receta propia → se precargan alérgenos y composición → fijar precio y categoría → guardar.
3. En cada plato: **Editar**, **Ocultar/Mostrar** y **Quitar**.
4. Botones de acceso directo: **Mis pedidos**, **Mis recetas**, **Ver carta digital**, **Personalizar carta** y **Generar QR**.

### Pedidos

- Menú lateral → **Pedidos** (el badge muestra los activos).
- **Nuevo pedido**: elegir recetas y cantidades, total, método de pago y notas.
- Filtros visibles: **Estado** y rango de **Desde/Hasta**. Ver, Editar, Completar y Eliminar en cada tarjeta.

## 4. Alérgenos

- En **Crear/Editar receta** y en **Agregar/editar plato** hay casillas de texto con los alérgenos (Gluten, Lácteos, Huevo…).
- La API precarga los alérgenos detectados en los ingredientes; se pueden marcar o desmarcar.
- La ficha de la receta y las exportaciones PDF/imagen muestran la leyenda de alérgenos.
- En la **carta digital**, el comensal marca sus alérgenos en «Mis alergias» y los platos que los contienen desaparecen. «Quitar filtro» los restaura.

## 5. Personalizar la carta

1. Panel del chef → **Personalizar carta**.
2. Ajustar: nombre del establecimiento, 4 colores, orientación, tamaño (A4/A5/carta/personalizado), tipografía, versión (con precio / sin precio / ambas), organización (categorías / precio / manual), logo, alérgenos y composición.
3. La **vista previa en vivo** se actualiza al instante.
4. **Guardar carta**; luego **Exportar PDF** (diálogo de impresión) o **Exportar imagen** (PNG).

## 6. QR de la carta

1. Panel del chef → **Generar QR**.
2. Personalizar colores, tamaño, logo central, marco y etiqueta.
3. **Descargar PNG**, **Descargar SVG** o **Guardar PDF**.
4. Al escanearlo se abre la carta digital con las mismas opciones guardadas.

## 7. Descargar recetas

En el detalle de cualquier receta (propia, importada o sugerida por IA): botón **Descargar** → **PDF** o **Imagen (PNG)**.

## 8. Apariencia

- **Ajustes → Tema y modo**: 12 temas, claro/oscuro, alto contraste y accesibilidad.
- **Liquid Glass (efecto vidrio)**: activo por defecto. Al apagarlo, las superficies pasan a ser sólidas sin desenfoque (más legibles). Se recuerda tras cerrar y abrir la app.

## 9. Ejecutar y verificar

```bash
npm run dev:server     # API en :3001
npm run dev:app        # App en :5173
npm run dev:landing    # Landing en :5174
npm run build:exe      # Actualizar .exe + navegador
npm run verificar:pedidos
npm run verificar:carta
npm run verificar:glass
npm run verificar:desktop
```

**Cuenta admin de demo:** `admin@sazonlab.test` / `admin1234` (se restablece en cada arranque; configurable con `ADMIN_CORREO`/`ADMIN_PASSWORD`).
