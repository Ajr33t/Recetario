# ✉️ Configurar el correo de recuperación (dominio propio)

**Estado actual:** ✅ **ya funciona** con Resend (`SazónLab <onboarding@resend.dev>`),
verificado extremo a extremo (correo entregado, sin variables sin rellenar).

Cuando quieras que los correos salgan desde **tu propio dominio** (`sazonlab.com`),
tienes dos caminos. Ninguno requiere tocar el código de la app.

---

## Camino 1 — Resend con `sazonlab.com` (recomendado: mejor entregabilidad)

El dominio `sazonlab.com` ya está creado en Resend (*pending*). Solo faltan
**tres registros DNS** en tu proveedor de dominios (los NS son `tr.atakdns.com`
y `eu.atakdns.com`).

### Registros que debes añadir

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| **TXT** (DKIM) | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC+w+bhuBixkmuJuT/86HBIlzHaagu+syWBmW9JWGeWJ6Xl/9qJvA8DQka1TXUad0QZZe/IvieAPBPYk5QWgdPO7R1TPLLh541KSAI/PaWvm0f46C0umkN87auT5jWOkOgWflk9fmLMoTNVpPNJuqDhGmqxxqh2QQuec18sl1A8uQIDAQAB` | Auto |
| **CNAME** (SPF) | `rsend` | `rsend-sae1.forge.rmta.net` | Auto |
| **CNAME** (SPF) | `send` | `send.forge.rmta.net` | Auto |

> Añade también un registro **DMARC** si no lo tienes:
> `_dmarc` → TXT → `v=DMARC1; p=none; rua=mailto:soporte@sazonlab.com`

### Pasos

1. En el panel de tu proveedor de dominios, añade los tres registros (TXT y los dos CNAME).
2. Vuelve a <https://resend.com/domains> y pulsa **Verify** en `sazonlab.com`.
   (Puede tardar de unos minutos a unas horas según la propagación.)
3. Cuando el dominio esté **verified**, cambia una línea en `apps/api/.env`:

   ```env
   MAIL_FROM=SazónLab <no-reply@sazonlab.com>
   ```

4. Reinicia el servidor (`npm run dev:server`) y usa *Ajustes → Correo de
   recuperación → Enviar correo de prueba* para comprobarlo.

Con esto los correos salen desde **tu dominio**, firmados con DKIM y con SPF, que
es lo que evita que caigan en spam.

---

## Camino 2 — Zoho SMTP (lo que ya usas para tu buzón)

`sazonlab.com` ya apunta a Zoho Mail (`mx.zoho.com`), así que si tienes un
buzón en ese dominio puedes enviar desde él sin tocar DNS:

| Campo | Valor |
|-------|-------|
| Servidor SMTP | `smtp.zoho.com` |
| Puerto | `465` (seguro ✔) o `587` |
| Tu correo | el buzón que tengas en `sazonlab.com` |
| Contraseña | **contraseña de aplicación** de Zoho (*Ajustes → Seguridad → Contraseñas de aplicación*), no tu contraseña normal |
| Remitente | `SazónLab <no-reply@sazonlab.com>` |

En SazónLab: *Ajustes → Correo de recuperación* → proveedor **«Otro servidor SMTP»**
(se guardan host, puerto, usuario, clave y remitente) → **Enviar correo de prueba**.

---

## Comprobación de que todo está bien

```bash
# Estado del transporte (resend | smtp | demo)
curl http://localhost:3001/api/correo/estado

# Enviar un correo de prueba a tu propia dirección
curl -X POST http://localhost:3001/api/correo/prueba \
  -H "Content-Type: application/json" -H "Authorization: Bearer <tu-token>" \
  -d '{"correo":"tu-correo@sazonlab.com"}'
```

- En el **panel de Resend** (Emails) verás cada envío con su estado
  (`delivered`, `bounced`, `complained`).
- En la app: *Ajustes → Correo de recuperación* muestra el transporte activo.

---

## Plantillas (el texto se edita sin desplegar)

Los correos se generan con **plantillas publicadas en Resend**:

| Plantilla | Alias | Para qué |
|-----------|-------|----------|
| SazónLab — recuperación de contraseña | `sazonlab-recuperacion` | Código + botón «Restablecer contraseña» |
| SazónLab — eliminación de cuenta | `sazonlab-eliminacion` | Confirmación de borrado de cuenta |

Puedes editarlas en <https://resend.com/templates> (texto, colores, botón) y los
cambios se aplican al instante: **no hay que desplegar la aplicación**.

Variables disponibles: `NOMBRE`, `CODIGO`, `ENLACE` y `APP_URL`.
