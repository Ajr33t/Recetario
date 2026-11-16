# 📘 Manual de usuario — SazónLab (Recetario Inteligente)

**Versión:** 1.1 · **Fecha:** noviembre de 2026
**Aplicación:** SazónLab — Recetario Inteligente (web + escritorio)

> Sugerencia de la casa: 🍳 «Cocina con lo que ya tienes en casa».

---

## 1. ¿Qué es SazónLab?

SazónLab es un recetario digital que:

- **te sugiere recetas** según los ingredientes que tienes en casa;
- te deja **crear y guardar tus propias recetas** (con historial de versiones, papelera y favoritos);
- te permite **compartir** recetas como imagen PNG, PDF, enlace o texto;
- genera un **libro de cocina** en PDF con portada, índice y páginas de medidas;
- incluye un **asistente con IA** (local con Ollama, o en la nube) y un **chatbot** que conoce tus recetas;
- se personaliza con **12 temas × 3 modos** (claro, oscuro, alto contraste) con diseño *Liquid Glass*;
- funciona **en el navegador, en el celular, en la tablet y como aplicación de escritorio (.exe)**;
- es **accesible**: cumple WCAG 2.1 AA verificado con axe-core.

---

## 2. Instalación

### 2.1 Opción web (recomendada para probar)

**Requisitos:** Node.js 22 o superior.

```bash
npm install --ignore-scripts   # 1) dependencias
npm run dev:server             # 2) terminal 1 → API en http://localhost:3001
npm run dev:app                # 3) terminal 2 → app en http://localhost:5173
```

> ⚠️ El `--ignore-scripts` es importante: evita que npm intente recompilar
> `better-sqlite3` y Electron (que no necesitan herramientas nativas).

Abre el navegador en **http://localhost:5173**.

Opcional: `npm run dev:landing` levanta la página oficial en http://localhost:5174.

### 2.2 Opción escritorio (sin Node, sin internet)

1. Ejecuta el instalador `SazónLab-Setup-1.0.0.exe` (está en la raíz de la carpeta del proyecto).
2. Elige la carpeta de instalación y finaliza.
3. Abre **SazónLab** desde el menú Inicio.

La app de escritorio incluye su propia API y base de datos SQLite local
(`%APPDATA%\SazonLab\sazonlab.db`), así que **funciona sin conexión**.

### 2.3 Estructura de la carpeta del proyecto

```
recetario/
├── apps/          web (demo) · api (servidor) · desktop (.exe) · landing
├── docs/          manual, informes, informe final, acta de cierre
├── scripts/       suites de verificación automática
├── assets/        logo de la marca
└── legal/         textos legales compartidos
```

---

## 3. Primer arranque

| Paso | Qué hacer |
|------|-----------|
| 1 | Abre `http://localhost:5173` (o la app de escritorio). |
| 2 | Regístrate con tu correo y una contraseña de 8+ caracteres. |
| 3 | Elige un tema y un modo (barra superior → icono de paleta). |
| 4 | Escribe un ingrediente en **Buscar por ingredientes** y pulsa el botón. |

La primera visita muestra el **tour de bienvenida** (6 pasos). Puedes omitirlo con
«Omitir» y repetirlo cuando quieras desde **Ajustes → Accesibilidad → Repetir tour**.

---

## 4. Tu cuenta

### 4.1 Registrarse e iniciar sesión

- **Crear cuenta**: en el menú «Ingresar» (arriba a la derecha) → «Crear una cuenta nueva».
- **Iniciar sesión**: con correo y contraseña. La sesión dura 7 días (JWT) y se
  guarda en el equipo, pero tus recetas viven en el servidor: las ves desde cualquier
  dispositivo.
- **Invitado**: puedes usar el buscador, explorar el catálogo, ver recetas y usar el
  asistente sin crear cuenta.

### 4.2 Recuperar la contraseña (por correo) 🔑

Si olvidaste tu contraseña:

1. En **Iniciar sesión** pulsa **«¿Olvidaste tu contraseña?»**.
2. Escribe tu correo y pulsa **«Enviar código»**.
3. Recibes un correo con:
   - un **código de 6 dígitos**, y
   - un **enlace de un clic** («Restablecer contraseña»).
4. Puedes usar cualquiera de los dos:
   - con el **código**: escríbelo en el formulario y pon la contraseña nueva;
   - con el **enlace**: se abre `/#/recuperar?token=…`, solo escribes la contraseña nueva.

> 🔧 **¿No te llega el correo?** Revisa la bandeja de spam y, sobre todo, que el
> administrador haya configurado un proveedor de correo (sección 11).

### 4.3 Tu perfil

**Menú de cuenta (avatar, arriba a la derecha) → Mi perfil**:

- **Foto**: sube una imagen (se recorta automáticamente a un círculo).
- **Avatar**: elige un icono (Font Awesome) que sustituye la foto si no hay ninguna.
- **Color**: elige el color de tu avatar.
- **Nombre y biografía**.
- **Cambiar contraseña**: introduce la actual y la nueva (8+ caracteres).
- **Zona de peligro**: **eliminar tu cuenta** con un código de 6 dígitos enviado a tu correo.

---

## 5. Buscar recetas

La página **Buscar** tiene tres modos:

### 5.1 Por ingredientes

1. Escribe un ingrediente y pulsa Enter (se crea una *chip*).
2. Repite hasta tener varios.
3. Pulsa **«Buscar recetas»**: aparecen ordenadas por **ingredientes que te faltan**.
4. Arriba verás la **idea del chef** (si hay IA configurada).

### 5.2 Por nombre

Escribe el nombre de un plato («pasta», «arroz»). Todo se traduce al inglés para
buscar y se vuelve a español al mostrar ✓.

### 5.3 Explorar

Categorías y **áreas con recetas reales** (se filtran las que no tienen ninguna).

### 5.4 Filtros avanzados

| Filtro | Dónde | Qué hace |
|--------|-------|----------|
| Ingredientes excluidos | Buscar | Quita recetas que contengan lo que no quieres (chips). |
| Dieta (vegetariana/vegana) | Buscar | Filtra por la categoría y las etiquetas que informa TheMealDB. |
| Tiempo máximo, dificultad, texto, etiqueta | Mis recetas | Filtra tus recetas propias. |

> Si alguna receta no tiene el dato para evaluarse, SazónLab **te lo avisa**
> (nunca se filtra en silencio).

### 5.5 Búsquedas recientes

Debajo del buscador aparecen las **últimas 8 búsquedas** (chips). Pulsa una para
repetirla con un clic, o **«Vaciar historial»** para borrarlas.

---

## 6. El Asistente (IA y chatbot) 🤖

En el menú lateral → **Asistente**.

- **Pregunta en lenguaje natural**: «¿Qué puedo cocinar con pollo y arroz?».
- El asistente usa, en este orden:
  1. **IA local con Ollama** (si la tienes instalada: sin internet, sin enviar tus datos);
  2. **OpenAI** o **Gemini** (si hay clave de API);
  3. el **asistente local de SazónLab**, que usa los datos reales de la app
     (tus recetas, el catálogo, las medidas) y **siempre responde**.
- La etiqueta de la esquina indica qué motor está activo.
- Con sesión iniciada, la conversación **se guarda** y la ves desde cualquier
  dispositivo; con «Borrar chat» la eliminas.

### Instalar la IA local (Ollama)

1. Descarga Ollama desde <https://ollama.com> e instálalo.
2. Descarga un modelo (por ejemplo, en otra terminal):

   ```bash
   ollama pull llama3.2
   ```

3. Reinicia el servidor de SazónLab. En **Ajustes → Sistema, IA y nube** verás
   «IA local con Ollama».

---

## 7. Tus recetas

### 7.1 Crear y editar

**Mis recetas → «Crear receta»**: título, descripción, tiempo, dificultad,
porciones, foto, etiquetas, ingredientes y pasos.

Al editar se guarda una **versión nueva**: desde el detalle de la receta puedes
**restaurar** cualquier versión anterior.

### 7.2 Filtrar mis recetas

En **Mis recetas** tienes una barra de filtros: texto (título o etiqueta),
tiempo máximo, dificultad y etiqueta. Debajo verás «Mostrando X de Y recetas».

### 7.3 Favoritos

Guarda recetas del catálogo o las tuyas con el corazón. Están en **Favoritos**.

### 7.4 Papelera

Al eliminar una receta pasa a la **papelera** (se conserva 30 días). Desde
**Papelera** puedes restaurarla o borrarla definitivamente.

### 7.5 Libro de cocina (PDF)

En **Mis recetas** selecciona las recetas que quieres y pulsa
**«Generar libro de cocina»**: verás la portada, el **índice con número de
página**, las recetas y una **página fija de medidas**. Desde ahí, «Descargar
libro en PDF».

---

## 8. Compartir 🍽️

En el detalle de una receta → **Compartir**:

| Opción | Resultado |
|--------|-----------|
| Publicar y copiar enlace | Enlace público de la receta. |
| Copiar receta como texto | Texto listo para pegar en un chat. |
| Descargar como imagen (PNG) | Tarjeta con foto y datos. |
| Exportar a PDF | Documento imprimible. |

---

## 9. Medidas y equivalencias

**Medidas** (en el menú lateral): convierte tazas, cucharadas, mililitros, gramos
y grados Fahrenheit, con tablas de equivalencias en **español e inglés**.
Ejemplo: 2 tazas = 473,176 ml.

---

## 10. Temas, modos y accesibilidad

### 10.1 Temas y modos

- **Icono de paleta** (barra superior): elige entre **12 temas** y previsualízalos.
- **Icono de sol/luna**: alterna rápido entre **claro** y **oscuro**.
- **Alto contraste**: interruptor independiente en Ajustes → Accesibilidad
  (prevalece sobre el modo).

### 10.2 Accesibilidad

- **Tamaño de fuente**: normal, grande, extra grande (o `Ctrl/Cmd + +/-`).
- **Reducir movimiento**: desactiva las animaciones.
- **Subrayar enlaces**, **modo dislexia**.
- Navegación completa por teclado, *SkipLink* al contenido y `aria-live` en los avisos.

### 10.3 Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl/Cmd + K` | Buscador global. |
| `Ctrl/Cmd + +` / `-` | Tamaño de fuente. |
| `Esc` | Cerrar menús y diálogos. |
| `Enter` | Enviar el mensaje del chat. |

---

## 11. Correo: configúralo una vez y funciona para todos ✉️

Para que la recuperación de contraseña llegue de verdad al correo de cada
usuario hace falta **un solo proveedor de correo** (lo configura el administrador):

**Ajustes → Correo de recuperación** (solo administradores):

1. Elige el proveedor:
   - **Gmail**: `smtp.gmail.com`, puerto **465**, seguro ✔.
     Activa la verificación en 2 pasos y crea una **contraseña de aplicación**.
   - **Outlook / Microsoft 365**: `smtp.office365.com`, puerto **587**.
   - **Otro SMTP**: host y puerto de tu proveedor.
   - **Resend** (API): pega tu clave `re_…` (3.000 correos/mes gratis).
2. Escribe tu correo y la contraseña de aplicación.
3. **«Guardar configuración»** y luego **«Enviar correo de prueba»**.

✅ A partir de ese momento **todos los usuarios** reciben su código y su enlace
automáticamente; no hay que hacer nada más por usuario.

> Sin proveedor configurado, SazónLab funciona en **modo demo**: el código se
> muestra en pantalla y en la consola del servidor.

También puedes configurarlo por archivo (`apps/api/.env`, ver
`apps/api/.env.example`) o con la variable de entorno correspondiente.

---

## 12. Nube y base de datos ☁️

- **Sin configurar nada**: todo se guarda en **SQLite local** (`apps/api/data/`),
  y en el `.exe` en `%APPDATA%\SazonLab\sazonlab.db`.
- **Con `DATABASE_URL`**: la app usa **PostgreSQL en la nube** (Neon, Supabase,
  Railway, RDS…) como almacén de verdad y SQLite queda como caché local para
  seguir funcionando sin internet.

```
DATABASE_URL=postgresql://usuario:clave@host.neon.tech:5432/sazonlab?sslmode=require
```

En **Ajustes → Sistema, IA y nube** ves el motor activo y el botón
**«Sincronizar con la nube»**, que sube tus cambios y descarga los de tus otros
dispositivos (última escritura gana).

---

## 13. Panel de administración 🛡️

Visible solo con rol **administrador** (menú de cuenta → Administración):

- **Crear usuario** (nombre, correo, contraseña y rol).
- **Cambiar el rol** de cualquier cuenta.
- **Inactivar/Activar** cuentas: la sesión se cierra al instante y no puede volver
  a entrar hasta reactivarla.
- Todo queda registrado en la **auditoría** del sistema.

---

## 14. App de escritorio

- Se instala como cualquier programa de Windows.
- **Sin internet y sin Node**: lleva su propia API y su base de datos.
- Los datos quedan en `%APPDATA%\SazonLab\sazonlab.db` (no se borran al desinstalar).
- Si la abres sin conexión, el buscador sigue funcionando con las recetas locales.

---

## 15. Preguntas frecuentes

**¿El chat no responde como una IA?**
Revisa la etiqueta en la esquina del chat: si dice «Asistente local», no hay IA
instalada. Instala Ollama (sección 6) o añade una clave de OpenAI/Gemini.

**¿No me llega el correo de recuperación?**
Revisa spam y confirma que el proveedor de correo esté configurado (sección 11).

**¿Cómo saco mis recetas?**
Ajustes → Datos → **Exportar JSON** (y **Importar JSON** para restaurarlas).

**¿Cómo cambio el color o la foto de perfil?**
Menú de cuenta → Mi perfil → Personalización.

**¿Puedo usar SazónLab sin crear cuenta?**
Sí: buscador, explorar, medidas y asistente funcionan como invitado; para guardar
recetas necesitas cuenta.

**¿Se puede usar en el celular?**
Sí: la web es responsiva (probada a 390×844 y 768×1024) y el instalador también.

---

## 16. Accesos rápidos

| Quiero… | Dónde |
|---------|-------|
| Buscar por ingredientes | Menú lateral → Buscar por ingredientes |
| Pregarle al asistente | Menú lateral → Asistente |
| Crear una receta | Mis recetas → Crear receta |
| Ver mis favoritos | Menú lateral → Favoritos |
| Compartir una receta | Detalle de la receta → Compartir |
| Cambiar el tema/modo | Barra superior → paleta / sol-luna |
| Ajustes y accesibilidad | Menú lateral → Ajustes |
| Mi perfil y contraseña | Menú de cuenta (avatar) → Mi perfil |
| Descargar la app de escritorio | Inicio (CTA) o pie de página |

---

*Manual de la versión 1.1 — SazónLab. ¿Encontraste un error? Repórtalo al equipo del proyecto.*
