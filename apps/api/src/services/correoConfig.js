import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Configuración del correo de recuperación (Fase 10).
 *
 * El objetivo es **configurar una sola vez**: con un proveedor (SMTP o
 * Resend) TODOS los usuarios reciben su correo de recuperación sin hacer
 * nada más. Si no hay proveedor, la app funciona en modo demo (el código
 * se muestra en pantalla).
 *
 * La configuración se guarda en `apps/api/.env` y se aplica en caliente
 * (no hace falta reiniciar el servidor).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.resolve(__dirname, '../../.env');

/** Valores por defecto de los proveedores más usados. */
export const PROVEEDORES = {
  gmail: {
    nombre: 'Gmail',
    host: 'smtp.gmail.com',
    puerto: 465,
    seguro: true,
    ayuda: 'Activa la verificación en 2 pasos y crea una «contraseña de aplicación».',
  },
  outlook: {
    nombre: 'Outlook / Microsoft 365',
    host: 'smtp.office365.com',
    puerto: 587,
    seguro: false,
    ayuda: 'Puede pedir que habilites SMTP autenticado en tu cuenta.',
  },
  otro: {
    nombre: 'Otro servidor SMTP',
    host: '',
    puerto: 587,
    seguro: false,
    ayuda: 'Escribe el host y el puerto que te indique tu proveedor.',
  },
  resend: {
    nombre: 'Resend (API)',
    host: '',
    puerto: 0,
    seguro: false,
    ayuda: 'Pega tu clave API (re_...). Solo necesitas una cuenta gratuita.',
  },
};

/** Estado actual del correo (lo que ve la interfaz). */
export function leerConfigCorreo() {
  const smtpHost = process.env.SMTP_HOST || '';
  const resend = process.env.RESEND_API_KEY || '';
  return {
    activo: Boolean(smtpHost || resend),
    transporte: smtpHost ? 'smtp' : resend ? 'resend' : 'demo',
    smtp: {
      host: smtpHost,
      puerto: Number(process.env.SMTP_PORT || 465),
      seguro: process.env.SMTP_SECURE === 'true',
      usuario: process.env.SMTP_USER || '',
      desde: process.env.MAIL_FROM || '',
    },
    resend: { clave: resend ? '••••••••' : '' },
    archivo: ENV_PATH,
    appUrl: process.env.APP_URL || 'http://localhost:5173',
  };
}

/** Reescribe el .env conservando el resto de variables. */
function escribirEnv(cambios) {
  let contenido = '';
  try {
    contenido = fs.readFileSync(ENV_PATH, 'utf8');
  } catch {
    contenido = '# Configuración de SazónLab\n';
  }

  const lineas = contenido.split(/\r?\n/);
  const actualizadas = [];
  const vistas = new Set();

  for (const linea of lineas) {
    const clave = linea.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1];
    if (clave && cambios[clave] !== undefined) {
      actualizadas.push(`${clave}=${cambios[clave]}`);
      vistas.add(clave);
    } else {
      actualizadas.push(linea);
    }
  }

  for (const [clave, valor] of Object.entries(cambios)) {
    if (!vistas.has(clave)) actualizadas.push(`${clave}=${valor}`);
  }

  const texto = `${actualizadas.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
  try {
    fs.writeFileSync(ENV_PATH, texto, 'utf8');
    return ENV_PATH;
  } catch (err) {
    // En el .exe instalado la carpeta del programa puede ser de solo
    // lectura: se guarda junto a los datos del usuario.
    const alternativa = path.join(process.env.SAZONLAB_DATA_DIR || os.tmpdir(), 'sazonlab.env');
    try {
      fs.writeFileSync(alternativa, texto, 'utf8');
      console.warn(
        `[SazónLab] No se pudo escribir ${ENV_PATH} (${err.code}); se usó ${alternativa}.`,
      );
      return alternativa;
    } catch (err2) {
      throw new Error(
        `No se pudo guardar la configuración del correo: ${err2.message}. ` +
          'Edítala a mano en apps/api/.env.',
      );
    }
  }
}

/**
 * Guarda la configuración de correo y la aplica en caliente.
 * @param {{proveedor: string, host?: string, puerto?: number, usuario?: string,
 *   clave?: string, desde?: string, seguro?: boolean}} datos
 */
export function guardarConfigCorreo(datos) {
  const proveedor = PROVEEDORES[datos.proveedor] ? datos.proveedor : 'otro';
  const cambios = {};

  if (proveedor === 'resend') {
    cambios.RESEND_API_KEY = (datos.clave || '').trim();
    cambios.SMTP_HOST = '';
    cambios.SMTP_USER = '';
    cambios.SMTP_PASS = '';
    cambios.SMTP_PORT = '';
    cambios.SMTP_SECURE = '';
  } else {
    const base = PROVEEDORES[proveedor];
    cambios.SMTP_HOST = (datos.host || base.host).trim();
    cambios.SMTP_PORT = String(datos.puerto || base.puerto);
    cambios.SMTP_SECURE = String(Boolean(datos.seguro ?? base.seguro));
    cambios.SMTP_USER = (datos.usuario || '').trim();
    cambios.SMTP_PASS = datos.clave || '';
    cambios.RESEND_API_KEY = '';
  }

  if (datos.desde) cambios.MAIL_FROM = datos.desde.trim();
  if (!cambios.MAIL_FROM && cambios.SMTP_USER) {
    cambios.MAIL_FROM = `SazónLab <${cambios.SMTP_USER}>`;
  }

  escribirEnv(cambios);

  // Aplicar en caliente (sin reiniciar)
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === '') delete process.env[clave];
    else process.env[clave] = valor;
  }

  return leerConfigCorreo();
}
