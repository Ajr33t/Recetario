import net from 'node:net';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enviarCodigoCorreo, estadoCorreo } from './mailer.js';

/**
 * Servidor SMTP mínimo (solo para pruebas): acepta un correo y lo guarda.
 * Permite verificar de verdad que el envío por SMTP funciona, sin
 * depender de un proveedor externo.
 */
function crearSmtpCapturador() {
  const capturado = { from: '', to: [], cuerpo: '' };
  let cuerpo = '';
  let estadoAuth = 0; // 0 = normal, 1 = espera usuario, 2 = espera contraseña

  const servidor = net.createServer((socket) => {
    let buffer = '';
    let enDatos = false;
    socket.write('220 smtp.test ESMTP\r\n');

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let corte;
      while ((corte = buffer.indexOf('\r\n')) >= 0) {
        const linea = buffer.slice(0, corte);
        buffer = buffer.slice(corte + 2);

        if (enDatos) {
          if (linea === '.') {
            enDatos = false;
            capturado.cuerpo = cuerpo;
            cuerpo = '';
            socket.write('250 OK: mensaje recibido\r\n');
          } else {
            cuerpo += `${linea}\n`;
          }
          continue;
        }

        if (estadoAuth === 1) {
          estadoAuth = 2;
          socket.write('334 UGFzc3dvcmQ6\r\n'); // "Password:"
          continue;
        }
        if (estadoAuth === 2) {
          estadoAuth = 0;
          socket.write('235 2.7.0 Authentication successful\r\n');
          continue;
        }

        const cmd = (linea.split(' ')[0] || '').toUpperCase();
        if (cmd === 'EHLO' || cmd === 'HELO') {
          socket.write('250-smtp.test\r\n250 AUTH LOGIN\r\n');
        } else if (cmd === 'AUTH') {
          estadoAuth = 1;
          socket.write('334 VXNlcm5hbWU6\r\n'); // "Username:"
        } else if (cmd === 'MAIL') {
          capturado.from = linea;
          socket.write('250 OK\r\n');
        } else if (cmd === 'RCPT') {
          capturado.to.push(linea);
          socket.write('250 OK\r\n');
        } else if (cmd === 'DATA') {
          enDatos = true;
          cuerpo = '';
          socket.write('354 Envía el mensaje y termina con .\r\n');
        } else if (cmd === 'QUIT') {
          socket.write('221 Bye\r\n');
          socket.end();
        } else {
          socket.write('250 OK\r\n');
        }
      }
    });
    socket.on('error', () => {});
  });

  return new Promise((resolve) => {
    servidor.listen(0, '127.0.0.1', () => {
      resolve({ servidor, capturado, puerto: servidor.address().port });
    });
  });
}

/** Decodifica quoted-printable (así lo envía nodemailer) y resuelve UTF-8. */
function decodificarQuotedPrintable(texto) {
  const limpio = texto.replace(/=\r?\n/g, '');
  const bytes = [];
  for (let i = 0; i < limpio.length; i++) {
    if (limpio[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(limpio.slice(i + 1, i + 3))) {
      bytes.push(parseInt(limpio.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(limpio.charCodeAt(i) & 0xff);
    }
  }
  return Buffer.from(bytes).toString('utf8');
}

test('el correo de recuperación se envía por SMTP con código y enlace', async () => {
  const { servidor, capturado, puerto } = await crearSmtpCapturador();

  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = String(puerto);
  process.env.SMTP_USER = 'prueba';
  process.env.SMTP_PASS = 'prueba';
  process.env.MAIL_FROM = 'SazónLab <prueba@sazonlab.test>';

  try {
    const resultado = await enviarCodigoCorreo('chef@sazonlab.test', '123456', 'recuperacion', {
      enlace: 'http://localhost:5173/#/recuperar?token=abc123',
    });

    assert.equal(resultado.demo, false, 'no debe caer en modo demo con SMTP configurado');
    assert.equal(resultado.transporte, 'smtp');

    const cuerpo = decodificarQuotedPrintable(capturado.cuerpo);
    assert.match(cuerpo, /123456/, 'el correo debe traer el código');
    assert.match(cuerpo, /recuperar\?token=abc123/, 'el correo debe traer el enlace de un clic');
    assert.match(cuerpo, /SazónLab/, 'el correo debe identificar la marca');
    assert.deepEqual(estadoCorreo(), { activo: true, transporte: 'smtp' });
  } finally {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.MAIL_FROM;
    await new Promise((r) => servidor.close(r));
  }
});

test('sin proveedor de correo se informa el modo demo', async () => {
  delete process.env.SMTP_HOST;
  delete process.env.RESEND_API_KEY;

  const resultado = await enviarCodigoCorreo('chef@sazonlab.test', '654321', 'recuperacion');
  assert.equal(resultado.demo, true);
  assert.equal(resultado.transporte, 'demo');
  assert.deepEqual(estadoCorreo(), { activo: false, transporte: 'demo' });
});
