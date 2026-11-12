/**
 * Envío de correos de SazónLab (Fase 3 — restablecimiento de contraseña).
 *
 * Modos (conservador, sin dependencias nuevas):
 * 1. REAL: si existe RESEND_API_KEY en el entorno, envía vía la API de
 *    Resend con fetch nativo (sin librería).
 * 2. DEMO: sin clave, imprime el código en la consola del servidor y
 *    devuelve `demo: true` para que la UI pueda mostrarlo (solo fuera de
 *    producción) — así el flujo es totalmente probar en desarrollo.
 */

/**
 * Envía un correo de 6 dígitos.
 * @param {string} correo destino
 * @param {string} codigo código de 6 dígitos
 * @param {'recuperacion'|'eliminacion'} [motivo] motivo del código
 * @returns {Promise<{ demo: boolean }>} demo=true si no hay proveedor real
 */
export async function enviarCodigoCorreo(correo, codigo, motivo = 'recuperacion') {
  const esEliminacion = motivo === 'eliminacion';
  const asunto = esEliminacion
    ? 'SazónLab — código para eliminar tu cuenta'
    : 'SazónLab — tu código de recuperación';
  const texto = esEliminacion
    ? `Hola, tu código para eliminar definitivamente tu cuenta es: ${codigo}\n\nVence en 15 minutos y la acción no se puede deshacer. Si no pediste esto, ignora este mensaje.`
    : `Hola, tu código para restablecer tu contraseña es: ${codigo}\n\nVence en 15 minutos. Si no pediste esto, ignora este mensaje.`;

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const respuesta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.MAIL_FROM || 'SazónLab <onboarding@resend.dev>',
          to: [correo],
          subject: asunto,
          text: texto,
        }),
      });
      if (respuesta.ok) return { demo: false };
      console.warn(`[SazónLab] Resend respondió ${respuesta.status}; se usa modo demo.`);
    } catch (err) {
      console.warn(`[SazónLab] Error enviando correo (${err.message}); modo demo.`);
    }
  }

  // Modo demo: el código queda visible para desarrollo/pruebas
  console.log(`[SazónLab][DEMO] Código de ${motivo} para ${correo}: ${codigo}`);
  return { demo: true };
}
