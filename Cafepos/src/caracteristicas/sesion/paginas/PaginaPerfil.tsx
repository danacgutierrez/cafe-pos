import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useSesion } from '../contexto/SesionContext.tsx';
import { Cargando } from '../../../compartido/componentes/Cargando.tsx';
import { MensajeError } from '../../../compartido/componentes/MensajeError.tsx';
import { traerMisPuntos } from '../../recompensas/servicios/recompensas.ts';
import { mensajeDeError } from '../../../compartido/api/errores.ts';

export default function PaginaPerfil() {
  const { usuario, salir } = useSesion();
  const idClient = usuario?.idClient;
  const [puntos, setPuntos] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!idClient) {
      setPuntos(null);
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const respuesta = await traerMisPuntos(idClient);
      setPuntos(respuesta.balance);
    } catch (e) {
      setPuntos(null);
      setError(mensajeDeError(e, 'No se pudieron cargar tus puntos.'));
    } finally {
      setCargando(false);
    }
  }, [idClient]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!usuario) return null;
  if (cargando) return <Cargando />;
  if (error) return <MensajeError mensaje={error} onReintentar={() => void cargar()} />;

  return (
    <>
      <div className="pagina__encabezado">
        <h1>Mi perfil</h1>
        <p className="pagina__bajada">Tus datos y un atajo a lo que más usas.</p>
      </div>

      <div className="perfil">
        <section className="tarjeta-form">
          <div className="perfil__avatar" aria-hidden="true">
            {usuario.correo.charAt(0).toUpperCase()}
          </div>
          <h2>{usuario.correo.split('@')[0]}</h2>
          <dl className="perfil__datos">
            <div><dt>Correo</dt><dd>{usuario.correo}</dd></div>
            <div><dt>Rol</dt><dd>{usuario.rol === 'client' ? 'Cliente' : usuario.rol}</dd></div>
            <div><dt>ID de cliente</dt><dd>{usuario.idClient ?? 'Sin vincular'}</dd></div>
            <div>
              <dt>Puntos</dt>
              <dd className="numero">
                {puntos === null ? 'Aún no tienes puntos' : puntos}
              </dd>
            </div>
          </dl>
          <button className="boton boton--secundario" onClick={salir}>Cerrar sesión</button>
        </section>

        <aside className="resumen">
          <h2>Accesos rápidos</h2>
          <Link to="/pedidos" className="boton boton--ancho boton--secundario">Mis pedidos</Link>
          <Link to="/recompensas" className="boton boton--ancho boton--secundario">Mis recompensas</Link>
          <Link to="/menu" className="boton boton--ancho">Hacer un pedido</Link>
        </aside>
      </div>
    </>
  );
}
