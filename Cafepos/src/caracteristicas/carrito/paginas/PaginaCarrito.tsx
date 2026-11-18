import { Link } from 'react-router';
import { useSesion } from '../../sesion/contexto/SesionContext.tsx';
import { subtotal, useCarrito } from '../estado/carrito.ts';

export default function PaginaCarrito() {
  const { usuario } = useSesion();
  const { items, cambiarCantidad, quitar, vaciar } = useCarrito();
  const total = subtotal(items);

  if (items.length === 0) {
    return (
      <div className="vacio">
        <p className="vacio__icono">🛒</p>
        <h1>Tu carrito está vacío</h1>
        <p className="pagina__bajada">Agrega algo rico desde el menú para empezar.</p>
        <Link to="/menu" className="boton">Explorar el menú</Link>
      </div>
    );
  }

  return (
    <>
      <div className="pagina__encabezado">
        <h1>Tu carrito</h1>
        <p className="pagina__bajada">Revisa tu pedido antes de continuar.</p>
      </div>

      <div className="carrito">
        <ul className="carrito__lista">
          {items.map((item) => (
            <li className="item-carrito" key={item.clave}>
              <div className="item-carrito__icono" aria-hidden="true">
                {item.tipo === 'bebida' ? '☕' : '🥐'}
              </div>
              <div className="item-carrito__info">
                <h3>{item.nombre}</h3>
                {item.personalizacion && (
                  <p className="item-carrito__nota">
                    {[
                      item.personalizacion.sizeId && 'Tamaño personalizado',
                      item.personalizacion.milkId && 'con leche',
                      item.personalizacion.sweetenerId && `dulzor ${item.personalizacion.sweetness ?? 50}%`,
                      item.personalizacion.note,
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}
                {!item.personalizacion && item.descripcion && (
                  <p className="item-carrito__nota">{item.descripcion}</p>
                )}
                <button className="enlace-peligro" onClick={() => quitar(item.clave)}>Quitar</button>
              </div>
              <div className="item-carrito__cantidad">
                <button onClick={() => cambiarCantidad(item.clave, item.cantidad - 1)} aria-label="Restar">−</button>
                <span className="numero">{item.cantidad}</span>
                <button onClick={() => cambiarCantidad(item.clave, item.cantidad + 1)} aria-label="Sumar">+</button>
              </div>
              <strong className="numero item-carrito__precio">
                ${(item.cantidad * item.precioUnitario).toFixed(2)}
              </strong>
            </li>
          ))}
        </ul>

        <aside className="resumen">
          <h2>Resumen</h2>
          <div className="resumen__fila">
            <span>Subtotal</span>
            <strong className="numero">${total.toFixed(2)}</strong>
          </div>
          <p className="resumen__nota">El total final se calcula en el servidor al confirmar.</p>
          {usuario ? (
            <Link to="/checkout" className="boton boton--ancho">Continuar al pago</Link>
          ) : (
            <Link to="/entrar" state={{ desde: '/checkout' }} className="boton boton--ancho">
              Entra para continuar
            </Link>
          )}
          <button className="enlace-peligro resumen__vaciar" onClick={vaciar}>Vaciar carrito</button>
        </aside>
      </div>
    </>
  );
}
