/**
 * Enlaces externos de la app (SazónLab).
 *
 * - `EXE_URL`: instalador de escritorio (NSIS). En desarrollo se sirve desde
 *   la landing (`landing/public`), en producción se define con `VITE_EXE_URL`.
 * - `ES_ESCRITORIO`: dentro del `.exe` (file://) no tiene sentido ofrecer
 *   descargar el instalador, así que la app lo oculta.
 */
export const EXE_URL =
  import.meta.env.VITE_EXE_URL || 'http://localhost:5174/SazónLab-Setup-1.0.0.exe';

export const ES_ESCRITORIO = typeof window !== 'undefined' && window.location.protocol === 'file:';
