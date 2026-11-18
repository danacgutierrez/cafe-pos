import { Link } from 'react-router';
import { Cargando } from '../../../compartido/componentes/Cargando.tsx';
import { MensajeError } from '../../../compartido/componentes/MensajeError.tsx';
import { usePedidos } from '../hooks/usePedidos.ts';
import { useCatalogo } from '../../catalogo/hooks/useCatalogo.ts';
import { ETIQUETAS_ESTADO, claseEstado } from '../../../compartido/componentes/estados.ts';
import { nombreDetalle } from '../../../compartido/utilidades/nombres.ts';

export default function PaginaPedidos() {
  const { lista, cargando, error, cargar } = usePedidos();
  const { catalogo, productos } = useCatalogo();

  if (cargando) return <Cargando />;
  if (error) return <MensajeError mensaje={error} onReintentar={() => void cargar()} />;

  return (
    <>
      <div className="pagina__encabezado">
        <h1>Mis pedidos</h1>
        <p className="pagina__bajada">Consulta el estado y repite tus favoritos.</p>
      </div>

      {lista.length === 0 ? (
        <div className="vacio">
          <p className="vacio__icono">📋</p>
          <h2>Aún no tienes pedidos</h2>
          <p className="pagina__bajada">Cuando hagas tu primer pedido podrás seguirlo desde aquí.</p>
          <Link to="/menu" className="boton">Hacer mi primer pedido</Link>
        </div>
      ) : (
        <ul className="pedidos">
          {lista.map((pedido) => (
            <li className="pedido" key={pedido.id}>
              <div className="pedido__principal">
                <div className="pedido__numero">
                  <span className="etiqueta etiqueta--numero">Pedido #{pedido.id}</span>
                  <span className="pedido__fecha">
                    {new Date(pedido.createdAt).toLocaleString('es-MX', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <span className={`estado ${claseEstado(pedido.status)}`}>
                  {ETIQUETAS_ESTADO[pedido.status]}
                </span>
              </div>
              <p className="pedido__detalle">
                {pedido.orderDetails.map((d) => `${d.quantity}× ${nombreDetalle(d, catalogo, productos)}`).join(' · ')}
              </p>
              <div className="pedido__pie">
                <strong className="numero">${Number(pedido.total).toFixed(2)}</strong>
                <Link to={`/pedidos/${pedido.id}`} className="boton boton--secundario boton--chico">
                  Ver seguimiento
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
