import nodemailer from 'nodemailer';
import { Resend } from 'resend';

/**
 * Envío de correos de SazónLab (Fase 3 + Fase 10 — correo real).
 *
 * Transportes, en orden de preferencia:
 * 1. **Resend** (`RESEND_API_KEY`): envío con el SDK oficial y **plantillas
 *    publicadas en Resend** (`RESEND_PLANTILLA_*`), de modo que el texto del
 *    correo se edita en el panel de Resend sin desplegar la app.
 * 2. **SMTP** (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`): nodemailer;
 *    funciona con Gmail (contraseña de aplicación), Outlook/365 y SMTP
 *    corporativo.
 * 3. **DEMO**: sin proveedor configurado, el código se imprime en la consola
 *    y la UI lo muestra (solo fuera de producción) para probar el flujo.
 *
 * Todos los correos van en español y con un **enlace de un clic** además del
 * código de 6 dígitos.
 */

const remitente = () => process.env.MAIL_FROM || 'SazónLab <onboarding@resend.dev>';
/** Soporte/comunicaciones: a este correo responden los usuarios (Fase 11). */
const SOPORTE = process.env.MAIL_REPLY_TO || 'sazonlab2356@gmail.com';

/** Instancia perezosa del cliente de Resend. */
let clienteResend = null;
function obtenerResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!clienteResend) clienteResend = new Resend(process.env.RESEND_API_KEY);
  return clienteResend;
}

/** Envuelve el texto en una plantilla HTML con el estilo SazónLab
 *  (tonos tierra + cristal líquido) cuando no hay plantilla en Resend. */
function plantillaHtml({ titulo, texto, enlace, pie, destinatario }) {
  const boton = enlace
    ? `<p style="margin:26px 0;text-align:center">
        <a href="${enlace}" style="background-image:linear-gradient(180deg,#e8a94e 0%,#b45309 100%);
          background-color:#b45309;color:#ffffff;padding:15px 32px;border-radius:14px;
          text-decoration:none;font-weight:700;font-size:16px;display:inline-block;
          box-shadow:0 10px 24px rgba(180,83,9,.35), inset 0 1px 0 rgba(255,255,255,.5);
          border:1px solid #92400e;">${titulo}</a></p>
       <p style="font-size:12px;color:#9a7b56;text-align:center">¿No funciona? Copia esta dirección:<br>
        <span style="word-break:break-all;color:#a16207">${enlace}</span></p>`
    : '';
  const aviso = destinatario
    ? `<p style="margin-top:18px;background:#f3ece1;border:1px dashed #cbb491;border-radius:12px;
        padding:14px 18px;font-size:12.5px;line-height:1.7;color:#7a6349">
        <strong style="color:#4a2f1d">🔒 Confidencialidad:</strong> este correo fue enviado únicamente a
        <strong>${destinatario}</strong>. Si tú no eres esa persona, <strong>elimínalo de inmediato</strong>:
        no debe ser entregado, reenviado ni divulgado.</p>`
    : '';
  return `<!doctype html><html lang="es"><body style="margin:0;padding:40px 12px;background-color:#efe6d8;
    background-image:radial-gradient(circle at 15% 10%, rgba(217,119,6,.14), transparent 45%),
      radial-gradient(circle at 85% 90%, rgba(120,74,43,.16), transparent 45%);
    font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#3f2d1e">
    <div style="max-width:560px;margin:0 auto;background-color:#ffffff;
      background-image:linear-gradient(180deg,#ffffff 0%,#fdfaf5 100%);border:1px solid #ffffff;
      border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(74,45,29,.18), inset 0 1px 0 #ffffff">
      <div style="background-color:#5b3a22;background-image:linear-gradient(135deg,#6b4423 0%,#4a2f1d 60%,#3b2417 100%);padding:26px 32px">
        <p style="margin:0;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#f0b45f;font-weight:700">🍳 SazónLab</p>
        <p style="margin:8px 0 0 0;font-size:24px;font-weight:700;color:#ffffff">${titulo}</p>
      </div>
      <div style="height:5px;background-image:linear-gradient(90deg,#7c4f2c,#e0a458,#7c4f2c)"></div>
      <div style="padding:28px 32px;background-color:#fdfaf5">
        <p style="white-space:pre-line;line-height:1.7;font-size:15px;color:#6b5540;margin:0 0 4px">${texto}</p>
        ${boton}
        <p style="margin-top:24px;background:#fbf5ea;border-left:4px solid #d97706;border-radius:12px;
          padding:14px 18px;font-size:13px;line-height:1.7;color:#6b5540">${pie}</p>
        ${aviso}
      </div>
      <div style="padding:18px 32px;background-color:#f0e6d6;border-top:1px solid #e3d5bd">
        <p style="margin:0;font-size:12px;line-height:1.8;color:#8a6c4f">${'©'} 2026 SazónLab · Recetario Inteligente</p>
      </div>
    </div></body></html>`;
}

/** Construye el mensaje (texto plano + HTML) según el motivo. */
function construirMensaje({ correo, codigo, motivo, enlace, nombre }) {
  const esEliminacion = motivo === 'eliminacion';
  const esVerificacion = motivo === '2fa';
  const asunto = esEliminacion
    ? 'SazónLab — código para eliminar tu cuenta'
    : esVerificacion
      ? 'SazónLab — tu código de verificación en dos pasos'
      : 'SazónLab — tu código de recuperación';
  const texto = esEliminacion
    ? `Hola${nombre ? ` ${nombre}` : ''}, tu código para eliminar definitivamente tu cuenta es: ${codigo}\n\nVence en 15 minutos y la acción no se puede deshacer. Si no pediste esto, ignora este mensaje.`
    : esVerificacion
      ? `Hola${nombre ? ` ${nombre}` : ''}, tu código de verificación en dos pasos es: ${codigo}\n\nVence en 5 minutos y solo se usa una vez. Si no pediste iniciar sesión, ignora este mensaje.`
      : `Hola${nombre ? ` ${nombre}` : ''}, tu código para restablecer tu contraseña es: ${codigo}\n\nVence en 15 minutos. Si no pediste esto, ignora este mensaje.`;
  const confidencialidad = `\n\nConfidencialidad: este correo fue enviado únicamente a ${correo}. Si tú no eres esa persona, elimínalo de inmediato: no debe ser entregado, reenviado ni divulgado.`;
  const pie = esEliminacion
    ? 'Si no solicitaste la eliminación, no hagas nada: tu cuenta seguirá intacta.'
    : esVerificacion
      ? 'Si no solicitaste iniciar sesión, ignora este correo: nadie puede entrar sin este código.'
      : 'Si no solicitaste el cambio, ignora este correo: tu contraseña seguirá igual.';

  return {
    asunto,
    texto: texto + confidencialidad,
    html: plantillaHtml({
      titulo: esEliminacion
        ? 'Confirmar la eliminación'
        : esVerificacion
          ? 'Verificar mi identidad'
          : 'Restablecer tu contraseña',
      texto,
      enlace,
      pie,
      destinatario: correo,
    }),
    destinatario: correo,
    codigo,
    enlace,
    nombre: nombre || '',
    esEliminacion,
    motivo,
  };
}

/** Plantilla de Resend configurada para este motivo (si existe). */
function plantillaDe(motivo) {
  // La verificación en dos pasos no usa plantilla de Resend: lleva HTML propio
  // (el copy cambia cada vez y no queremos dependencia entre deploys).
  if (motivo === '2fa') return null;
  const id =
    motivo === 'eliminacion'
      ? process.env.RESEND_PLANTILLA_ELIMINACION
      : process.env.RESEND_PLANTILLA_RECUPERACION;
  return id || null;
}

/** Envía con Resend (SDK oficial). Devuelve el id del correo o null si falla. */
async function enviarConResend(mensaje) {
  const resend = obtenerResend();
  if (!resend) return null;

  const plantilla = plantillaDe(mensaje.motivo || 'recuperacion');
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  const base = {
    from: remitente(),
    replyTo: SOPORTE,
    to: [mensaje.destinatario],
    subject: mensaje.asunto,
  };

  const payload = plantilla
    ? {
        ...base,
        template: {
          id: plantilla,
          variables: {
            NOMBRE: mensaje.nombre,
            CODIGO: mensaje.codigo,
            ENLACE: mensaje.enlace || '',
            APP_URL: appUrl,
            DESTINATARIO: mensaje.destinatario,
          },
        },
      }
    : { ...base, text: mensaje.texto, html: mensaje.html };

  // Clave de idempotencia (SDK ≥ 6): una por intento (patrón <evento>/<entidad>).
  // Evita correos duplicados si se reintenta la misma petición.
  const idempotencyKey = `${mensaje.motivo || 'recuperacion'}/${mensaje.destinatario}-${mensaje.codigo}`;

  const { data, error } = await resend.emails.send(payload, { idempotencyKey });
  if (error) {
    console.warn(`[SazónLab] Resend falló: ${error.message}`);
    return null;
  }
  return data?.id || null;
}

/** Envía por SMTP con nodemailer (si hay configuración SMTP). */
async function enviarSmtp(mensaje) {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_SECURE } = process.env;
  const transporte = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || (SMTP_SECURE === 'true' ? 465 : 587)),
    secure: SMTP_SECURE === 'true',
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  const info = await transporte.sendMail({
    from: remitente(),
    replyTo: SOPORTE,
    to: mensaje.destinatario,
    subject: mensaje.asunto,
    text: mensaje.texto,
    html: mensaje.html,
  });
  return { id: info.messageId };
}

/**
 * Estado del servicio de correo (para el panel de Ajustes y las suites).
 * @returns {{activo: boolean, transporte: 'resend'|'smtp'|'demo'}}
 */
export function estadoCorreo() {
  if (process.env.RESEND_API_KEY) return { activo: true, transporte: 'resend' };
  if (process.env.SMTP_HOST) return { activo: true, transporte: 'smtp' };
  return { activo: false, transporte: 'demo' };
}

/**
 * Envía el código (y el enlace) de recuperación/eliminación.
 * @param {string} correo destino
 * @param {string} codigo código de 6 dígitos
 * @param {'recuperacion'|'eliminacion'} [motivo]
 * @param {{enlace?: string, nombre?: string}} [opciones]
 * @returns {Promise<{demo: boolean, transporte: string, id?: string}>}
 */
export async function enviarCodigoCorreo(correo, codigo, motivo = 'recuperacion', opciones = {}) {
  const mensaje = construirMensaje({
    correo,
    codigo,
    motivo,
    enlace: opciones.enlace,
    nombre: opciones.nombre,
  });

  if (process.env.RESEND_API_KEY) {
    try {
      const id = await enviarConResend(mensaje);
      if (id) {
        console.log(`[SazónLab] Correo enviado por Resend a ${correo} (${motivo}) · ${id}`);
        return { demo: false, transporte: 'resend', id };
      }
    } catch (err) {
      console.warn(`[SazónLab] Error Resend (${err.message}); se intenta otro transporte.`);
    }
  }

  if (process.env.SMTP_HOST) {
    try {
      await enviarSmtp(mensaje);
      console.log(`[SazónLab] Correo enviado por SMTP a ${correo} (${motivo}).`);
      return { demo: false, transporte: 'smtp' };
    } catch (err) {
      console.warn(`[SazónLab] Error SMTP (${err.message}); se usa otro transporte.`);
    }
  }

  // Modo demo: el código queda visible para desarrollo/pruebas
  console.log(`[SazónLab][DEMO] Código de ${motivo} para ${correo}: ${codigo}`);
  return { demo: true, transporte: 'demo' };
}
