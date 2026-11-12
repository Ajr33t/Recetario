/**
 * Cliente HTTP base para la API de SazónLab.
 * En desarrollo, Vite hace proxy de /api → http://localhost:3001.
 * En el .exe (file://) la API es un servidor local embebido: el puerto se
 * pasa como query param al cargar el renderer (ver desktop/main.js).
 * Adjunta el JWT de la sesión y cierra sesión automáticamente en 401.
 */
import { useAuthStore } from '../store/authStore.js';

const ES_ARCHIVO = typeof window !== 'undefined' && window.location.protocol === 'file:';
const PUERTO_EMBEBIDO =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('apiPort') : null;

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (ES_ARCHIVO && PUERTO_EMBEBIDO ? `http://127.0.0.1:${PUERTO_EMBEBIDO}/api` : '/api');

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Realiza una petición JSON a la API.
 * @param {string} path ruta relativa (ej. '/health')
 * @param {RequestInit} options opciones de fetch
 */
export async function apiFetch(path, options = {}) {
  const token = useAuthStore.getState().token;

  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Sin conexión con el servidor. Reintenta en unos segundos.', 0, null);
  }

  const data = await response.json().catch(() => null);

  // Token vencido o inválido: cerrar sesión (la UI reacciona al store)
  if (response.status === 401 && token) {
    useAuthStore.getState().logout();
  }

  if (!response.ok) {
    throw new ApiError(
      (data && data.error) || `Error del servidor (${response.status})`,
      response.status,
      data,
    );
  }

  return data;
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
};
