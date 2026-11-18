// Convierte la referencia de una línea de pedido (idBeverage o idProduct)
// en el nombre que la persona vio en el menú.
import type { Catalogo, Producto } from '../api/tipos.ts';

interface Referencia {
  idBeverage?: number;
  idProduct?: number;
}

export function nombreDetalle(
  referencia: Referencia,
  catalogo: Catalogo | null,
  productos: Producto[],
): string {
  if (referencia.idBeverage) {
    return catalogo?.beverages.find((b) => b.id === referencia.idBeverage)?.name
      ?? `Bebida #${referencia.idBeverage}`;
  }
  return productos.find((p) => p.id === referencia.idProduct)?.name
    ?? `Producto #${referencia.idProduct}`;
}
