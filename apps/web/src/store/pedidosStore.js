import { create } from 'zustand';
import { api } from '../services/api.js';

/**
 * Contador de pedidos activos (punto 1 del encargo).
 * Store propio para que el sidebar lo muestre como badge y la página de
 * Pedidos lo refresque tras cada alta, edición, completado o borrado.
 * Si no hay sesión o no hay conexión, el badge queda en 0 (sin ruido).
 */
export const usePedidosStore = create((set) => ({
  activos: 0,
  total: 0,
  refetch: async () => {
    try {
      const datos = await api.get('/pedidos/contador');
      set({ activos: datos.activos ?? 0, total: datos.total ?? 0 });
    } catch {
      set({ activos: 0, total: 0 });
    }
  },
}));
