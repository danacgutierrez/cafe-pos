// Mantiene el historial sincronizado con la sesión.
import { useEffect } from 'react';
import { useSesion } from '../../sesion/contexto/SesionContext.tsx';
import { usePedidos as usePedidosStore } from '../estado/pedidos.ts';

export function usePedidos() {
  const { usuario } = useSesion();
  const estado = usePedidosStore();
  const { cargar, vaciar } = estado;

  useEffect(() => {
    if (usuario?.idClient) void cargar();
    else vaciar();
  }, [usuario, cargar, vaciar]);

  return estado;
}
