import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { Cargando } from '../../../compartido/componentes/Cargando.tsx';
import { MensajeError } from '../../../compartido/componentes/MensajeError.tsx';
import { ETIQUETAS_ESTADO, PASOS, claseEstado, clasePago } from '../../../compartido/componentes/estados.ts';
import { claveBebida, useCarrito } from '../../carrito/estado/carrito.ts';
import { usePedidos as usePedidosStore } from '../estado/pedidos.ts';
import { usePedidos } from '../hooks/usePedidos.ts';
import { useCatalogo } from '../../catalogo/hooks/useCatalogo.ts';
import { nombreDetalle } from '../../../compartido/utilidades/nombres.ts';
import { mensajeDeError } from '../../../compartido/api/errores.ts';
import { cancelarPedido, repetirPedido, traerEstado } from '../servicios/pedidos.ts';
import { traerResumen } from '../../pagos/servicios/pagos.ts';
import type { EstadoPedido, RepeticionPedido, ResumenPago } from '../../../compartido/api/tipos.ts';

export default function PaginaSeguimiento() {
  const { id } = useParams();
  const idPedido = Number(id);
  const ubicacion = useLocation();
  const recienCreado = Boolean((ubicacion.state as { recienCreado?: boolean } | null)?.recienCreado);
  const idValido = Number.isInteger(idPedido) && idPedido > 0;

  const [estado, setEstado] = useState<EstadoPedido | null>(null);
  const [resumen, setResumen] = useState<ResumenPago | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [repeticion, setRepeticion] = useState<RepeticionPedido | null>(null);
  const [procesando, setProcesando] = useState(false);

  usePedidos(); // asegura que el historial esté cargado al entrar directo
  const { catalogo, productos } = useCatalogo();
  const agregar = useCarrito((s) => s.agregar);
  const pedido = usePedidosStore((s) => s.lista.find((p) => p.id === idPedido));
  const recargarPedidos = usePedidosStore((s) => s.cargar);

  async function cargar() {
    if (!idValido) return;
    setError(null);
    setEstado(null);
    setResumen(null);
    try {
      const [e, r] = await Promise.all([traerEstado(idPedido), traerResumen(idPedido)]);
      setEstado(e);
      setResumen(r);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo consultar el pedido.'));
    }
  }

  useEffect(() => {
    void cargar();
  }, [idPedido]);

  async function cancelar() {
    setProcesando(true);
    setError(null);
    try {
      await cancelarPedido(idPedido);
      const actualizado = await traerEstado(idPedido);
      setEstado(actualizado);
      void recargarPedidos();
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo cancelar el pedido.'));
    } finally {
      setProcesando(false);
    }
  }

  async function repetir() {
    setProcesando(true);
    setError(null);
    try {
      const resultado = await repetirPedido(idPedido);
      setRepeticion(resultado);
      for (const detalle of resultado.details) {
        const original = pedido?.orderDetails.find((d) =>
          detalle.idBeverage ? d.idBeverage === detalle.idBeverage : d.idProduct === detalle.idProduct,
        );
        if (detalle.idBeverage) {
          agregar({
            clave: claveBebida(detalle.idBeverage, original?.customization),
            tipo: 'bebida',
            id: detalle.idBeverage,
            nombre: nombreDetalle(detalle, catalogo, productos),
            cantidad: detalle.quantity,
            precioUnitario: Number(detalle.currentPrice),
            personalizacion: original?.customization,
          });
        } else if (detalle.idProduct) {
          agregar({
            clave: `p-${detalle.idProduct}`,
            tipo: 'producto',
            id: detalle.idProduct,
            nombre: nombreDetalle(detalle, catalogo, productos),
            cantidad: detalle.quantity,
            precioUnitario: Number(detalle.currentPrice),
          });
        }
      }
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo repetir el pedido.'));
    } finally {
      setProcesando(false);
    }
  }

  // Los cuatro estados: sin dirección válida (vacío), cargando, error y cargado.
  if (!idValido) {
    return (
      <div className="vacio">
        <p className="vacio__icono">🔎</p>
        <h1>No encontramos ese pedido</h1>
        <p className="pagina__bajada">Revisa el número o vuelve a tu historial.</p>
        <Link to="/pedidos" className="boton">Mis pedidos</Link>
      </div>
    );
  }
  if (error && !estado) return <MensajeError mensaje={error} onReintentar={() => void cargar()} />;
  if (!estado) return <Cargando />;

  const indiceActual = PASOS.indexOf(estado.status);
  const cancelable = estado.status === 'PENDING';

  return (
    <>
      {recienCreado && (
        <p className="aviso aviso--exito">¡Pedido confirmado! Gracias por tu compra.</p>
      )}

      <div className="pagina__encabezado">
        <h1>Seguimiento del pedido #{estado.id}</h1>
        <p className="pagina__bajada">Así va tu pedido, en tiempo real.</p>
      </div>

      {error && <p className="aviso aviso--error">{error}</p>}

      <div className="seguimiento">
        <section className="tarjeta-form">
          <h2>Estado</h2>
          <p className={`estado ${claseEstado(estado.status)}`}>{estado.label ?? ETIQUETAS_ESTADO[estado.status]}</p>
          <ol className="linea-tiempo">
            {PASOS.map((paso, i) => (
              <li
                key={paso}
                className={`linea-tiempo__paso ${i <= indiceActual ? 'linea-tiempo__paso--hecho' : ''}`}
              >
                <span className="linea-tiempo__punto">{i < indiceActual ? '✓' : i + 1}</span>
                <span>{ETIQUETAS_ESTADO[paso]}</span>
              </li>
            ))}
          </ol>
          {cancelable && (
            <button className="boton boton--peligro" onClick={() => void cancelar()} disabled={procesando}>
              Cancelar pedido
            </button>
          )}
        </section>

        <aside className="resumen">
          <h2>Detalles</h2>
          <div className="resumen__fila">
            <span>Total del pedido</span>
            <strong className="numero">${Number(estado.total).toFixed(2)}</strong>
          </div>
          <div className="resumen__fila">
            <span>Pago</span>
            <span className={clasePago(resumen?.paid ? 'APPROVED' : 'PENDING')}>
              {resumen?.paid ? 'Pagado' : 'Pendiente de pago'}
            </span>
          </div>
          {resumen && (
            <div className="resumen__fila">
              <span>Cubierto</span>
              <strong className="numero">${Number(resumen.approved).toFixed(2)}</strong>
            </div>
          )}
          {pedido && (
            <ul className="resumen__items">
              {pedido.orderDetails.map((d) => (
                <li key={d.id}>
                  <span>{d.quantity}× {nombreDetalle(d, catalogo, productos)}</span>
                  <span className="numero">${Number(d.price).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}

          <button className="boton boton--secundario boton--ancho" onClick={() => void repetir()} disabled={procesando}>
            Repetir este pedido
          </button>
          {repeticion && (
            <div className="aviso aviso--info">
              <p>Agregado al carrito. Total estimado: ${Number(repeticion.total).toFixed(2)}</p>
              {repeticion.warnings.map((w) => <p key={w}>{w}</p>)}
              <Link to="/carrito" className="enlace">Ver carrito →</Link>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
