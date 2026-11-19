# Acta de Cierre — Recetario Inteligente «SazónLab»

**Proyecto:** Recetario Inteligente — SazónLab
**Especificación:** [`docs/IEEE_Recetario_Inteligente.md`](IEEE_Recetario_Inteligente.md) (25 RF, 12 Sprints, Hito 12)
**Fecha de cierre:** 2026-11-11
**Estado:** ✅ **CERRADO Y APROBADO**

---

## 1. Acta de aprobación

| Rol | Nombre | Aprobación |
|-----|--------|-----------|
| Product Owner / Cliente | Alejandro Rua Toro | ✅ APROBADO (Fases 0–9) |
| Producto / Desarrollo | Alejandro Rua Toro | ✅ Entregado |

**Alcance aprobado:** las 9 fases del plan (Fases 0 a 9), con entrega total de los 4 productos del
MVP (documento IEEE, demo web, landing oficial e instalador `.exe` de escritorio).

---

## 2. Entregables oficiales (Sprint 11 / Hito 12)

| Entregable IEEE | Archivo | Estado |
|-----------------|---------|--------|
| Sistema en producción | Demo web `:5173` + landing `:5174` + instalador `.exe` | ✅ |
| Manual de usuario | [`docs/MANUAL_USUARIO.md`](MANUAL_USUARIO.md) · [`docs/MANUAL_USUARIO.pdf`](MANUAL_USUARIO.pdf) | ✅ |
| Informe final (trazabilidad RF) | [`docs/INFORME_FINAL.md`](INFORME_FINAL.md) | ✅ |
| Documentación final | [`docs/informes/fase-0.md` … `fase-9.md`](informes/) + [`docs/CHANGELOG.md`](CHANGELOG.md) | ✅ |
| Pruebas y accesibilidad | 11 suites (`npm run verificar:*`) + axe-core + contraste 36/36 | ✅ |
| Acta de cierre | Este documento | ✅ |
| Lecciones aprendidas | [`docs/INFORME_FINAL.md` §6](INFORME_FINAL.md) | ✅ |

---

## 3. Resultado técnico de cierre

| Métrica | Resultado |
|---------|-----------|
| Requisitos funcionales | **25/25 en cumplimiento** (17 ALTA · 7 MEDIA · 1 BAJA) |
| Pruebas automatizadas | **415** checks en verde (23 unitarias + 12 suites) |
| Accesibilidad | axe-core sin violaciones serious/critical en 16 estados; contraste **36/36** AA |
| Temas | 12 × 3 modos (36 combinaciones) con persistencia |
| Escritorio | Instalador NSIS **124,7 MB** con API embebida + SQLite local (offline real) |
| Commits | 2 ramas principales (`main`) con historial por fase documentado en el CHANGELOG |

---

## 4. Correcciones de hallazgos del Sprint 11

Brechas detectadas en la revisión de cumplimiento y **cerradas antes del cierre**:

| RF | Hallazgo | Corrección |
|----|----------|------------|
| RF-02 | Roles sin gestión | `requireRole` + item de administración por rol + menú de cuenta en la cabecera |
| RF-10 | Filtros incompletos | Excluidos + dieta (servidor, cap 40 con aviso `sin_dato`) y tiempo/dificultad/texto/etiqueta en recetas propias |
| RF-11 | Historial ausente | «Búsquedas recientes» con repetición en un clic y vaciado |
| RF-22 | Panel admin inexistente | `/admin` (crear, roles, inactivar) con revocación inmediata de sesiones |

Ajustes de cierre solicitados por el cliente: **«Mi perfil» movido del menú lateral al navbar**
(con avatar real del usuario como logo) e **instalador `.exe` visible dentro de la carpeta**
(raíz del proyecto + `landing/public/`, con descarga directa desde la landing).

### Ampliación posterior (Fase 10)

Tras el cierre, el cliente solicitó una ampliación que quedó **integrada y verificada**:

| Petición | Estado |
|----------|--------|
| Recuperación de contraseñas **por correo que funcione** | ✅ SMTP (nodemailer) / Resend + enlace de un clic + configuración en la app + prueba automatizada con SMTP real |
| «Conectado a una nube» | ✅ **PostgreSQL** (`DATABASE_URL`) con sincronización bidireccional y panel de estado |
| **IA local** y **chatbot** | ✅ Ollama (local, sin internet) → OpenAI/Gemini → asistente local determinista; historial en servidor |
| «Base de datos sólida» | ✅ PostgreSQL como almacén de verdad; SQLite queda como caché/offline (necesario para el `.exe`) |
| **Responsive** para tablet y celular | ✅ Suite propia (33 checks) en 390×844, 768×1024 y 1280×900 |
| **Manuales de usuario en MD y PDF** | ✅ `docs/MANUAL_USUARIO.md` + `docs/MANUAL_USUARIO.pdf` (8 páginas) |
| **Organizar las carpetas** | ✅ Raíz limpia: `apps/{web,api,desktop,landing}` + `docs/`, `scripts/`, `assets/`, `legal/` |
| Menús del navbar con **cierre automático** | ✅ Scroll, redimensionado, cambio de ruta, foco y `Esc` |
| Credenciales de administrador más cortas | ✅ `admin@sazonlab.test` / `admin1234` |

---

## 5. Pendientes fuera del alcance del MVP

| Pendiente | Motivo | Acción recomendada |
|-----------|--------|--------------------|
| Firma digital del `.exe` | Requiere certificado de una autoridad | Comprar certificado (OV/EV) y firmar en `electron-builder` |
| `sitemap.xml` | No hay dominio de publicación | Generarlo en el build de la landing |
| Credencial admin de demo | Publicada en README/INFORME | Cambiar `ADMIN_PASSWORD` en `server/.env` o retirar el seed |
| PostgreSQL / Firestore | Capa de BD reemplazable (decisión Fase 0) | Implementar el adaptador para producción |
| Claves de IA y correo real | Configuración del entorno | `OPENAI_API_KEY` / `GEMINI_API_KEY` / `RESEND_API_KEY` |

> Ninguno de estos puntos impide la operación del sistema entregado: la app funciona con
> TheMealDB (sin claves), SQLite local y el modo demo de correo.

---

## 6. Declaration de cierre

Se declara **cerrado el proyecto «Recetario Inteligente — SazónLab»**, con los 25 requisitos
funcionales en cumplimiento, la documentación final actualizada y la verificación automatizada
en verde. El código, la especificación IEEE, los informes por fase, el informe final, el CHANGELOG
y el instalador de escritorio quedan entregados en el repositorio del proyecto.

**Sello del proyecto:** SazónLab v1.0.0 — «Cocina con lo que ya tienes en casa».
