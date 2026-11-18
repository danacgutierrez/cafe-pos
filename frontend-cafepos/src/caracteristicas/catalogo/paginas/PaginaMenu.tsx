import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Cargando } from '../../../compartido/componentes/Cargando.tsx';
import { MensajeError } from '../../../compartido/componentes/MensajeError.tsx';
import { Personalizador } from '../componentes/Personalizador.tsx';
import { itemDeProducto, useCarrito } from '../../carrito/estado/carrito.ts';
import { useCatalogo } from '../hooks/useCatalogo.ts';
import type { Beverage } from '../../../compartido/api/tipos.ts';

export default function PaginaMenu() {
  const { catalogo, productos, cargando, error, cargar } = useCatalogo();
  const { idBebida } = useParams();
  const navegar = useNavigate();
  const agregar = useCarrito((s) => s.agregar);
  const [tipoActivo, setTipoActivo] = useState<number | 'todos'>('todos');
  const [aviso, setAviso] = useState<string | null>(null);

  if (cargando && !catalogo) return <Cargando />;
  if (!catalogo) {
    return (
      <MensajeError
        mensaje={error ?? 'No se pudo cargar el menú.'}
        onReintentar={() => void cargar()}
      />
    );
  }

  // La personalización tiene dirección propia: /menu/:idBebida.
  const bebidaElegida = idBebida
    ? catalogo.beverages.find((b) => b.id === Number(idBebida)) ?? null
    : null;

  const bebidas = tipoActivo === 'todos'
    ? catalogo.beverages
    : catalogo.beverages.filter((b) => b.idDrinkType === tipoActivo);
  const productosActivos = productos.filter((p) => p.isActive);

  function agregarProducto(id: number) {
    const producto = productos.find((p) => p.id === id);
    if (!producto) return;
    agregar(itemDeProducto(producto));
    setAviso(`${producto.name} se agregó al carrito`);
  }

  return (
    <>
      {idBebida && catalogo && !bebidaElegida && (
        <p className="aviso aviso--error">
          No encontramos esa bebida. <Link to="/menu" className="enlace">Ver el menú</Link>
        </p>
      )}

      {bebidaElegida && (
        <Personalizador
          bebida={bebidaElegida as Beverage}
          catalogo={catalogo}
          onCerrar={() => navegar('/menu')}
        />
      )}

      <section className="hero">
        <div className="hero__texto">
          <p className="hero__eyebrow">Café recién hecho, siempre</p>
          <h1>Tu café, <em>a tu manera</em></h1>
          <p className="hero__bajada">
            Elige tu bebida, ajusta cada detalle y nosotros nos encargamos del resto.
            Cada pedido suma puntos para tu próxima recompensa.
          </p>
          <a href="#bebidas" className="boton">Ver el menú</a>
        </div>
        <div className="hero__adorno" aria-hidden="true">☕</div>
      </section>

      {aviso && (
        <p className="aviso aviso--exito aviso--flotante" onAnimationEnd={() => setAviso(null)}>
          {aviso}
        </p>
      )}

      <section id="bebidas" className="seccion">
        <div className="seccion__encabezado">
          <div>
            <h2>Bebidas personalizables</h2>
            <p className="pagina__bajada">Tamaño, leche, dulzor y extras: tú decides.</p>
          </div>
          <div className="filtros" role="group" aria-label="Filtrar bebidas">
            <button
              className={`filtro ${tipoActivo === 'todos' ? 'filtro--activo' : ''}`}
              onClick={() => setTipoActivo('todos')}
            >
              Todas
            </button>
            {catalogo.drinkTypes.map((tipo) => (
              <button
                key={tipo.id}
                className={`filtro ${tipoActivo === tipo.id ? 'filtro--activo' : ''}`}
                onClick={() => setTipoActivo(tipo.id)}
              >
                {tipo.name}
              </button>
            ))}
          </div>
        </div>

        {bebidas.length === 0 ? (
          <p className="vacio">No hay bebidas activas en esta categoría.</p>
        ) : (
          <div className="rejilla">
            {bebidas.map((bebida) => {
              const sabor = catalogo.flavors.find((f) => f.id === bebida.idFlavor);
              const tipo = catalogo.drinkTypes.find((t) => t.id === bebida.idDrinkType);
              return (
                <article className="tarjeta" key={bebida.id}>
                  <div className="tarjeta__icono" aria-hidden="true">
                    {tipo?.name === 'Té' ? '🍵' : '☕'}
                  </div>
                  <div className="tarjeta__cuerpo">
                    <div className="tarjeta__titulo">
                      <h3>{bebida.name}</h3>
                      <strong className="numero">${Number(bebida.basePrice).toFixed(2)}</strong>
                    </div>
                    <p className="tarjeta__meta">
                      {[tipo?.name, sabor?.name].filter(Boolean).join(' · ')}
                    </p>
                    <button className="boton boton--ancho" onClick={() => navegar(`/menu/${bebida.id}`)}>
                      Personalizar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="seccion">
        <div className="seccion__encabezado">
          <div>
            <h2>Para acompañar</h2>
            <p className="pagina__bajada">Algo dulce para tu café.</p>
          </div>
        </div>
        {productosActivos.length === 0 ? (
          <p className="vacio">No hay productos disponibles en este momento.</p>
        ) : (
          <div className="rejilla">
            {productosActivos.map((producto) => (
              <article className="tarjeta tarjeta--producto" key={producto.id}>
                <div className="tarjeta__icono" aria-hidden="true">🥐</div>
                <div className="tarjeta__cuerpo">
                  <div className="tarjeta__titulo">
                    <h3>{producto.name}</h3>
                    <strong className="numero">${Number(producto.price).toFixed(2)}</strong>
                  </div>
                  <p className="tarjeta__meta">{producto.description}</p>
                  <button className="boton boton--secundario boton--ancho" onClick={() => agregarProducto(producto.id)}>
                    Agregar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
