import { Navigate, Outlet } from 'react-router';
import { useSesion } from '../../caracteristicas/sesion/contexto/SesionContext.tsx';

export function RutaProtegida() {
  const { usuario } = useSesion();

  // Después de entrar siempre se empieza en el menú; no se guarda la ruta anterior.
  if (!usuario) {
    return <Navigate to="/entrar" replace />;
  }

  return <Outlet />;
}
