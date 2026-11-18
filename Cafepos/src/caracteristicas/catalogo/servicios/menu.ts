// Catálogo personalizable y productos sueltos. Los componentes sólo ven
// estas funciones; la forma del sobre se resuelve en compartido/api/api.ts.
import { api } from '../../../compartido/api/api.ts';
import type { Catalogo, Cotizacion, Personalizacion, Producto } from '../../../compartido/api/tipos.ts';

// GET /menu (público)
export async function traerCatalogo(): Promise<Catalogo> {
  const r = await api.get<Catalogo>('/menu');
  return r.data;
}

// POST /menu/quote (público): el sistema valida y calcula el precio.
export async function cotizar(idBeverage: number, personalizacion?: Personalizacion): Promise<Cotizacion> {
  const r = await api.post<Cotizacion>('/menu/quote', {
    idBeverage,
    customization: personalizacion,
  });
  return r.data;
}

// GET /products (público)
export async function traerProductos(): Promise<Producto[]> {
  const r = await api.get<Producto[]>('/products');
  return r.data;
}
