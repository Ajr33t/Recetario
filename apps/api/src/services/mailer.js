/**
 * Envío de correos de SazónLab (Fase 3 + Fase 10 — correo real).
 *
 * Transportes, en orden de preferencia:
 * 1. SMTP (nodemailer): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
 *    — funciona con Gmail (contraseña de aplicación), Outlook/365 y SMTP
 *    corporativo. Es el modo recomendado para un despliegue real.
 * 2. RESEND_API_KEY: API de Resend (fetch nativo, sin librería).
 * 3. DEMO: sin proveedor configurado, el código se imprime en la consola y
 *    la UI lo muestra (solo fuera de producción) para poder probar el flujo.
 *
 * Todos los correos se mandan en español y con un **enlace de un clic**
 * además del código de 6 dígitos.
 */
import nodemailer from 'nodemailer';

const remitente = () => process.env.MAIL_FROM || 'SazónLab <no-reply@sazonlab.app>';

/** Envuelve el texto en una plantilla HTML mínima y legible. */
function plantillaHtml({ titulo, texto, enlace, pie }) {
  const boton = enlace
    ? `<p style="margin:24px 0"><a href="${enlace}" style="background:#f59e0b;color:#1f2937;
        padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
        ${titulo}</a></p>
       <p style="font-size:12px;color:#6b7280">Si el botón no funciona, copia esta dirección:<br>
        <span style="word-break:break-all">${enlace}</span></p>`
    : '';
  return `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f8fafc;
    font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;
      box-shadow:0 8px 30px rgba(15,23,42,.08)">
      <h1 style="margin:0 0 12px;font-size:20px">🍳 SazónLab</h1>
      <p style="white-space:pre-line;line-height:1.6;font-size:15px">${texto}</p>
      ${boton}
      <p style="margin-top:28px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;
        padding-top:12px">${pie}</p>
    </div></body></html>`;
}

/** Construye el mensaje (texto plano + HTML) según el motivo. */
function construirMensaje({ correo, codigo, motivo, enlace }) {
  const esEliminacion = motivo === 'eliminacion';
  const titulo = esEliminacion
    ? 'Confirmar la eliminación de tu cuenta'
    : 'Restablecer tu contraseña';
  const texto = esEliminacion
    ? `Hola, tu código para eliminar definitivamente tu cuenta es: ${codigo}\n\nVence en 15 minutos y la acción no se puede deshacer. Si no pediste esto, ignora este mensaje.`
    : `Hola, tu código para restablecer tu contraseña es: ${codigo}\n\nVence en 15 minutos. Si no pediste esto, ignora este mensaje.`;
  const pie = esEliminacion
    ? 'Si no solicitaste la eliminación, no hagas nada: tu cuenta seguirá intacta.'
    : 'Si no solicitaste el cambio, ignora este correo: tu contraseña seguirá igual.';

  return {
    asunto: esEliminacion
      ? 'SazónLab — código para eliminar tu cuenta'
      : 'SazónLab — tu código de recuperación',
    texto,
    html: plantillaHtml({
      titulo,
      texto: esEliminacion ? texto : `${texto}`,
      enlace,
      pie,
    }),
    destinatario: correo,
  };
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
    to: mensaje.destinatario,
    subject: mensaje.asunto,
    text: mensaje.texto,
    html: mensaje.html,
  });
  return { id: info.messageId };
}

/** Envía con la API de Resend (fetch nativo). */
async function enviarResend(mensaje, apiKey) {
  const respuesta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: remitente(),
      to: [mensaje.destinatario],
      subject: mensaje.asunto,
      text: mensaje.texto,
      html: mensaje.html,
    }),
  });
  if (!respuesta.ok) throw new Error(`Resend respondió ${respuesta.status}`);
  return { id: 'resend' };
}

/**
 * Estado del servicio de correo (para el panel de Ajustes y las suites).
 * @returns {{activo: boolean, transporte: 'smtp'|'resend'|'demo'}}
 */
export function estadoCorreo() {
  if (process.env.SMTP_HOST) return { activo: true, transporte: 'smtp' };
  if (process.env.RESEND_API_KEY) return { activo: true, transporte: 'resend' };
  return { activo: false, transporte: 'demo' };
}

/**
 * Envía el código (y el enlace) de recuperación/eliminación.
 * @param {string} correo destino
 * @param {string} codigo código de 6 dígitos
 * @param {'recuperacion'|'eliminacion'} [motivo]
 * @param {{enlace?: string}} [opciones] enlace de un clic
 * @returns {Promise<{demo: boolean, transporte: string}>}
 */
export async function enviarCodigoCorreo(correo, codigo, motivo = 'recuperacion', opciones = {}) {
  const mensaje = construirMensaje({ correo, codigo, motivo, enlace: opciones.enlace });

  if (process.env.SMTP_HOST) {
    try {
      await enviarSmtp(mensaje);
      console.log(`[SazónLab] Correo enviado por SMTP a ${correo} (${motivo}).`);
      return { demo: false, transporte: 'smtp' };
    } catch (err) {
      console.warn(`[SazónLab] Error SMTP (${err.message}); se intenta otro transporte.`);
    }
  }

  if (process.env.RESEND_API_KEY) {
    try {
      await enviarResend(mensaje, process.env.RESEND_API_KEY);
      console.log(`[SazónLab] Correo enviado por Resend a ${correo} (${motivo}).`);
      return { demo: false, transporte: 'resend' };
    } catch (err) {
      console.warn(`[SazónLab] Error Resend (${err.message}); modo demo.`);
    }
  }

  // Modo demo: el código queda visible para desarrollo/pruebas
  console.log(`[SazónLab][DEMO] Código de ${motivo} para ${correo}: ${codigo}`);
  return { demo: true, transporte: 'demo' };
}
