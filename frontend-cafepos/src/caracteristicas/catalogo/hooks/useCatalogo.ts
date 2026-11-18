// Carga el menú público la primera vez que se usa.
import { useEffect } from 'react';
import { useCatalogo as useCatalogoStore } from '../estado/catalogo.ts';

export function useCatalogo() {
  const estado = useCatalogoStore();
  const { catalogo, error, cargando, cargar } = estado;

  useEffect(() => {
    if (!catalogo && !error && !cargando) void cargar();
  }, [catalogo, error, cargando, cargar]);

  return estado;
}
