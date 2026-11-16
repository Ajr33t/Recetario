import { hayNube, hostNube } from './postgres.js';

/**
 * Estado de la base de datos (Fase 10) — se muestra en Ajustes y en el
 * estado del sistema para que el usuario sepa dónde viven sus datos.
 *
 * - Con `DATABASE_URL`: **PostgreSQL en la nube** es el almacén de verdad y
 *   SQLite local actúa como caché/offline (necesario para el `.exe`).
 * - Sin `DATABASE_URL`: todo local en SQLite.
 */
export function estadoBaseDatos() {
  const archivo = process.env.SAZONLAB_DATA_DIR || 'server/data (desarrollo)';
  return {
    motor: hayNube() ? 'postgresql' : 'sqlite',
    modo: hayNube() ? 'nube + caché local' : 'local (offline)',
    archivo,
    nube: {
      configurado: hayNube(),
      host: hostNube(),
    },
  };
}
