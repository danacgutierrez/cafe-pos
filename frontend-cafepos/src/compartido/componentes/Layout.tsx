import { useCallback, useEffect, useState, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useSesion } from '../../caracteristicas/sesion/contexto/SesionContext.tsx';
import {
  api,
  EVENTO_BACKEND_ACTIVO,
  EVENTO_BACKEND_CAIDO,
} from '../api/api.ts';
import { Cargando } from './Cargando.tsx';
import { MensajeError } from './MensajeError.tsx';
import { Encabezado } from './Encabezado.tsx';
import { PiePagina } from './PiePagina.tsx';

export function Layout() {
  const { aviso, descartarAviso } = useSesion();
  const { pathname } = useLocation();
  const [verificando, setVerificando] = useState(true);
  const [backendCaido, setBackendCaido] = useState(false);

  // Toda pantalla depende del servicio, incluso el carrito (guarda localmente
  // pero necesita el backend para pagar). Se comprueba al entrar y al cambiar
  // de ruta, y también reaccionamos a los fallos de red de cualquier petición.
  const verificarBackend = useCallback(async () => {
    setVerificando(true);
    try {
      await api.get('/');
      setBackendCaido(false);
      return true;
    } catch {
      setBackendCaido(true);
      return false;
    } finally {
      setVerificando(false);
    }
  }, []);

  useEffect(() => {
    void verificarBackend();
  }, [pathname, verificarBackend]);

  useEffect(() => {
    const caer = () => setBackendCaido(true);
    const volver = () => setBackendCaido(false);
    window.addEventListener(EVENTO_BACKEND_CAIDO, caer);
    window.addEventListener(EVENTO_BACKEND_ACTIVO, volver);
    return () => {
      window.removeEventListener(EVENTO_BACKEND_CAIDO, caer);
      window.removeEventListener(EVENTO_BACKEND_ACTIVO, volver);
    };
  }, []);

  async function reintentar() {
    const conecto = await verificarBackend();
    // Recargamos para que la página actual vuelva a pedir sus datos: los
    // stores pueden tener guardado el error anterior.
    if (conecto) window.location.reload();
  }

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
        {verificando ? (
          <Cargando />
        ) : backendCaido ? (
          <MensajeError
            mensaje="No se pudo conectar con el backend. Revisa que el servicio esté encendido."
            onReintentar={() => void reintentar()}
          />
        ) : (
          <Suspense fallback={<Cargando />}>
            <Outlet />
          </Suspense>
        )}
      </main>
      <PiePagina />
    </div>
  );
}
