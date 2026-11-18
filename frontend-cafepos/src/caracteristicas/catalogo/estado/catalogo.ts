// El menú es público y se carga una vez; cualquier página lo lee de aquí.
import { create } from 'zustand';
import { traerCatalogo, traerProductos } from '../servicios/menu.ts';
import { mensajeDeError } from '../../../compartido/api/errores.ts';
import type { Catalogo, Producto } from '../../../compartido/api/tipos.ts';

interface EstadoCatalogo {
  catalogo: Catalogo | null;
  productos: Producto[];
  cargando: boolean;
  error: string | null;
  cargar: () => Promise<void>;
}

export const useCatalogo = create<EstadoCatalogo>()((set) => ({
  catalogo: null,
  productos: [],
  cargando: false,
  error: null,

  cargar: async () => {
    set({ cargando: true, error: null });
    try {
      const [catalogo, productos] = await Promise.all([traerCatalogo(), traerProductos()]);
      set({ catalogo, productos });
    } catch (e) {
      set({ error: mensajeDeError(e, 'No se pudo cargar el menú.') });
    } finally {
      set({ cargando: false });
    }
  },
}));
