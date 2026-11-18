import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { useSesion } from '../../caracteristicas/sesion/contexto/SesionContext.tsx';
import { Cargando } from './Cargando.tsx';
import { Encabezado } from './Encabezado.tsx';
import { PiePagina } from './PiePagina.tsx';

export function Layout() {
  const { aviso, descartarAviso } = useSesion();

  return (
    <div className="disposicion">
      <Encabezado />
      {aviso && (
        <div className="aviso-sesion" role="alert">
          <span>{aviso}</span>
          <button className="enlace" onClick={descartarAviso}>Entendido</button>
        </div>
      )}
      <main className="disposicion__contenido">
        <Suspense fallback={<Cargando />}>
          <Outlet />
        </Suspense>
      </main>
      <PiePagina />
    </div>
  );
}
