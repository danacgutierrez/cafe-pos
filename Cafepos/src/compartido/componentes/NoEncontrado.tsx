import { Link } from 'react-router';

export function NoEncontrado() {
  return (
    <div className="vacio">
      <p className="vacio__codigo">404</p>
      <h1>Esta página se fue por un café</h1>
      <p className="pagina__bajada">No encontramos lo que buscas. Vuelve al menú y sigue pidiendo.</p>
      <Link to="/menu" className="boton">Ir al menú</Link>
    </div>
  );
}
