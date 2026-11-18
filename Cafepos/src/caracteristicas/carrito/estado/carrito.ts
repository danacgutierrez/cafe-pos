// El carrito cambia seguido y lo leen varias pantallas, por eso vive en
// Zustand y se guarda en localStorage para sobrevivir recargas.
import { create } from 'zustand';
import type { ItemCarrito, Personalizacion, Producto } from '../../../compartido/api/tipos.ts';

const CLAVE_GUARDADO = 'cafepos-carrito';

export function claveProducto(id: number): string {
  return `p-${id}`;
}

// Dos personalizaciones distintas de la misma bebida son dos líneas.
export function claveBebida(id: number, personalizacion?: Personalizacion): string {
  return `b-${id}-${JSON.stringify(personalizacion ?? {})}`;
}

export function itemDeProducto(producto: Producto, cantidad = 1): ItemCarrito {
  return {
    clave: claveProducto(producto.id),
    tipo: 'producto',
    id: producto.id,
    nombre: producto.name,
    cantidad,
    precioUnitario: Number(producto.price),
    descripcion: producto.description,
  };
}

function leerGuardado(): ItemCarrito[] {
  try {
    const texto = localStorage.getItem(CLAVE_GUARDADO);
    return texto ? (JSON.parse(texto) as ItemCarrito[]) : [];
  } catch {
    return [];
  }
}

function guardar(items: ItemCarrito[]) {
  localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(items));
}

interface EstadoCarrito {
  items: ItemCarrito[];
  agregar: (item: ItemCarrito) => void;
  cambiarCantidad: (clave: string, cantidad: number) => void;
  quitar: (clave: string) => void;
  vaciar: () => void;
}

export const useCarrito = create<EstadoCarrito>()((set, get) => ({
  items: leerGuardado(),

  agregar: (item) => {
    const actuales = get().items;
    const existe = actuales.find((i) => i.clave === item.clave);
    const items = existe
      ? actuales.map((i) =>
          i.clave === item.clave ? { ...i, cantidad: i.cantidad + item.cantidad } : i,
        )
      : [...actuales, item];
    guardar(items);
    set({ items });
  },

  cambiarCantidad: (clave, cantidad) => {
    const items = get()
      .items.map((i) => (i.clave === clave ? { ...i, cantidad } : i))
      .filter((i) => i.cantidad > 0);
    guardar(items);
    set({ items });
  },

  quitar: (clave) => {
    const items = get().items.filter((i) => i.clave !== clave);
    guardar(items);
    set({ items });
  },

  vaciar: () => {
    guardar([]);
    set({ items: [] });
  },
}));

export function totalUnidades(items: ItemCarrito[]): number {
  return items.reduce((n, i) => n + i.cantidad, 0);
}

export function subtotal(items: ItemCarrito[]): number {
  return Math.round(items.reduce((n, i) => n + i.cantidad * i.precioUnitario, 0) * 100) / 100;
}
