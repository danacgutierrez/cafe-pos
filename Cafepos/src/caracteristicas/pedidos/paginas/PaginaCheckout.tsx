import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSesion } from '../../sesion/contexto/SesionContext.tsx';
import { subtotal, useCarrito } from '../../carrito/estado/carrito.ts';
import { usePedidos } from '../hooks/usePedidos.ts';
import { crearPedido } from '../servicios/pedidos.ts';
import { pagar } from '../../pagos/servicios/pagos.ts';
import { Campo } from '../../../compartido/componentes/Campo.tsx';
import { erroresDelServicio, mensajeDeError } from '../../../compartido/api/errores.ts';
import type { ErroresCampo } from '../../../compartido/api/errores.ts';
import type { CrearPedido, DeliveryMode, DetalleNuevo, FulfillmentType, PaymentMethod } from '../../../compartido/api/tipos.ts';

export default function PaginaCheckout() {
  const { usuario } = useSesion();
  const navegar = useNavigate();
  const agregarPedido = usePedidos().agregar;
  const { items, vaciar } = useCarrito();
  const total = subtotal(items);

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('PICKUP');
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('IMMEDIATE');
  const [scheduleTime, setScheduleTime] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [usePoints, setUsePoints] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [errores, setErrores] = useState<ErroresCampo>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!usuario?.idClient) {
    return (
      <div className="vacio">
        <h1>Necesitas una cuenta</h1>
        <Link to="/entrar" className="boton">Entrar</Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="vacio">
        <h1>No hay nada que pagar</h1>
        <p className="pagina__bajada">Tu carrito está vacío, así que no hay pedido que confirmar.</p>
        <Link to="/menu" className="boton">Ir al menú</Link>
      </div>
    );
  }

  function validar(): ErroresCampo {
    const e: ErroresCampo = {};
    if (fulfillmentType === 'SCHEDULED') {
      if (!scheduleTime) e.scheduleTime = 'Elige la fecha y hora de entrega.';
      else if (Number.isNaN(new Date(scheduleTime).getTime())) e.scheduleTime = 'Elige una fecha válida.';
    }
    return e;
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    const locales = validar();
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    try {
      const details: DetalleNuevo[] = items.map((item) =>
        item.tipo === 'bebida'
          ? { idBeverage: item.id, quantity: item.cantidad, customization: item.personalizacion }
          : { idProduct: item.id, quantity: item.cantidad },
      );

      const dto: CrearPedido = {
        idClient: usuario!.idClient!,
        details,
        deliveryMode,
        fulfillmentType,
        notes: notes || undefined,
        deliveryNotes: deliveryNotes || undefined,
        usePoints,
        ...(fulfillmentType === 'SCHEDULED' && scheduleTime
          ? { scheduleTime: new Date(scheduleTime).toISOString() }
          : {}),
      };

      const pedido = await crearPedido(dto);
      const pago = await pagar({ idOrder: pedido.id, method });

      agregarPedido(pedido);
      vaciar();
      navegar(`/pedidos/${pedido.id}`, {
        replace: true,
        state: { recienCreado: true, estadoPago: pago.status },
      });
    } catch (e) {
      const delServicio = erroresDelServicio(e, ['scheduleTime', 'notes', 'deliveryNotes']);
      setErrores(delServicio);
      if (Object.keys(delServicio).length === 0) {
        setErrorGeneral(mensajeDeError(e, 'No se pudo completar el pedido.'));
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="pagina__encabezado">
        <h1>Confirmar pedido</h1>
        <p className="pagina__bajada">Últimos detalles y listo.</p>
      </div>

      <form className="checkout" onSubmit={enviar} noValidate>
        <div className="checkout__columnas">
          <div className="tarjeta-form">
            <h2>Entrega</h2>
            <div className="opciones__lista opciones__lista--horizontal">
              <button
                type="button"
                className={`opcion ${deliveryMode === 'PICKUP' ? 'opcion--activa' : ''}`}
                onClick={() => setDeliveryMode('PICKUP')}
              >
                Recoger en tienda
              </button>
              <button
                type="button"
                className={`opcion ${deliveryMode === 'DELIVERY' ? 'opcion--activa' : ''}`}
                onClick={() => setDeliveryMode('DELIVERY')}
              >
                A domicilio
              </button>
            </div>

            <div className="opciones__lista opciones__lista--horizontal">
              <button
                type="button"
                className={`opcion ${fulfillmentType === 'IMMEDIATE' ? 'opcion--activa' : ''}`}
                onClick={() => {
                  setFulfillmentType('IMMEDIATE');
                  setErrores((actuales) => ({ ...actuales, scheduleTime: undefined }));
                }}
              >
                Lo antes posible
              </button>
              <button
                type="button"
                className={`opcion ${fulfillmentType === 'SCHEDULED' ? 'opcion--activa' : ''}`}
                onClick={() => setFulfillmentType('SCHEDULED')}
              >
                Programar
              </button>
            </div>

            {fulfillmentType === 'SCHEDULED' && (
              <Campo etiqueta="Fecha y hora" error={errores.scheduleTime}>
                <input
                  className="campo__control"
                  type="datetime-local"
                  value={scheduleTime}
                  aria-invalid={Boolean(errores.scheduleTime)}
                  onChange={(e) => {
                    setScheduleTime(e.target.value);
                    setErrores((actuales) => ({ ...actuales, scheduleTime: undefined }));
                  }}
                />
              </Campo>
            )}

            {deliveryMode === 'DELIVERY' && (
              <label className="campo">
                <span className="campo__etiqueta">Indicaciones de entrega</span>
                <input
                  className="campo__control"
                  placeholder="Calle, número, referencias…"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                />
              </label>
            )}

            <label className="campo">
              <span className="campo__etiqueta">Notas para el café (opcional)</span>
              <input
                className="campo__control"
                placeholder="Ej. sin canela"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>

            <label className="casilla">
              <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} />
              <span>Usar mis puntos de recompensa (si tengo suficientes)</span>
            </label>
          </div>

          <div className="tarjeta-form">
            <h2>Método de pago</h2>
            <div className="opciones__lista">
              {([
                ['CASH', 'Efectivo', 'Pagas al recoger'],
                ['TRANSFER', 'Transferencia', 'Depósito bancario'],
                ['CARD', 'Tarjeta (demo)', 'Aprobación inmediata'],
              ] as [PaymentMethod, string, string][]).map(([valor, titulo, detalle]) => (
                <button
                  type="button"
                  key={valor}
                  className={`opcion opcion--pago ${method === valor ? 'opcion--activa' : ''}`}
                  onClick={() => setMethod(valor)}
                >
                  <span>{titulo}</span>
                  <small>{detalle}</small>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="resumen resumen--checkout">
          <h2>Tu pedido</h2>
          <ul className="resumen__items">
            {items.map((item) => (
              <li key={item.clave}>
                <span>{item.cantidad}× {item.nombre}</span>
                <span className="numero">${(item.cantidad * item.precioUnitario).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="resumen__fila resumen__fila--total">
            <span>Total estimado</span>
            <strong className="numero">${total.toFixed(2)}</strong>
          </div>
          {errorGeneral && <p className="aviso aviso--error">{errorGeneral}</p>}
          <button className="boton boton--ancho" type="submit" disabled={enviando}>
            {enviando ? 'Procesando…' : 'Confirmar pedido'}
          </button>
          <Link to="/carrito" className="resumen__volver">← Volver al carrito</Link>
        </aside>
      </form>
    </>
  );
}
