import { Link, NavLink } from 'react-router';
import { useSesion } from '../../caracteristicas/sesion/contexto/SesionContext.tsx';
import { totalUnidades, useCarrito } from '../../caracteristicas/carrito/estado/carrito.ts';

function claseEnlace({ isActive }: { isActive: boolean }) {
  return isActive ? 'barra__enlace barra__enlace--activo' : 'barra__enlace';
}

export function Encabezado() {
  const { usuario, perfil, salir } = useSesion();
  const unidades = useCarrito((estado) => totalUnidades(estado.items));

  return (
    <header className="barra">
      <div className="barra__interior">
        <Link to="/menu" className="barra__marca">
          <img src="/logo.svg" alt="" />
          <span>Cafepos</span>
        </Link>

        <nav aria-label="Navegación principal">
          <ul className="barra__enlaces">
            <li><NavLink to="/menu" className={claseEnlace}>Menú</NavLink></li>
            <li>
              <NavLink to="/carrito" className={claseEnlace}>
                Carrito
                {unidades > 0 && <span className="barra__contador">{unidades}</span>}
              </NavLink>
            </li>
            {usuario && (
              <>
                <li><NavLink to="/pedidos" className={claseEnlace}>Mis pedidos</NavLink></li>
                <li><NavLink to="/recompensas" className={claseEnlace}>Recompensas</NavLink></li>
              </>
            )}
          </ul>
        </nav>

        <div className="barra__sesion">
          {usuario ? (
            <>
              <Link to="/perfil" className="barra__usuario">
                Hola, {perfil?.firstName?.trim() || usuario.correo.split('@')[0]}
              </Link>
              <button className="boton boton--secundario boton--chico" onClick={salir}>Salir</button>
            </>
          ) : (
            <Link to="/entrar" className="boton boton--chico">Entrar</Link>
          )}
        </div>
      </div>
    </header>
  );
}
