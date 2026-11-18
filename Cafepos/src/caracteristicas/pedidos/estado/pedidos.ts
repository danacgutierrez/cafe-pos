// Historial del cliente: estado con carga, error y vaciado.
import { create } from 'zustand';
import { traerMisPedidos } from '../servicios/pedidos.ts';
import { mensajeDeError } from '../../../compartido/api/errores.ts';
import type { Pedido } from '../../../compartido/api/tipos.ts';

interface EstadoPedidos {
  lista: Pedido[];
  cargando: boolean;
  error: string | null;
  cargar: () => Promise<void>;
  agregar: (pedido: Pedido) => void;
  vaciar: () => void;
}

export const usePedidos = create<EstadoPedidos>()((set) => ({
  lista: [],
  cargando: true,
  error: null,

  cargar: async () => {
    set({ cargando: true, error: null });
    try {
      set({ lista: await traerMisPedidos() });
    } catch (e) {
      set({ error: mensajeDeError(e, 'No se pudo cargar tus pedidos.') });
    } finally {
      set({ cargando: false });
    }
  },

  agregar: (pedido) => set((s) => ({ lista: [pedido, ...s.lista] })),
  vaciar: () => set({ lista: [], cargando: false, error: null }),
}));
