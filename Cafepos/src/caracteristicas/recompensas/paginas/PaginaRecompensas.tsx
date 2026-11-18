import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useSesion } from '../../sesion/contexto/SesionContext.tsx';
import { usePedidos } from '../../pedidos/hooks/usePedidos.ts';
import { Cargando } from '../../../compartido/componentes/Cargando.tsx';
import { MensajeError } from '../../../compartido/componentes/MensajeError.tsx';
import { planDeCanje, traerMisPuntos, traerMovimientos } from '../servicios/recompensas.ts';
import { mensajeDeError } from '../../../compartido/api/errores.ts';
import type { MisPuntos, Movimiento, PlanRecompensa } from '../../../compartido/api/tipos.ts';

const ETIQUETAS_MOVIMIENTO: Record<Movimiento['transactionType'], string> = {
  EARN: 'Ganaste',
  REDEEM: 'Canjeaste',
  REVERSE: 'Reversado',
  ADJUST: 'Ajuste',
};

export default function PaginaRecompensas() {
  const { usuario } = useSesion();
  const pedidos = usePedidos().lista;
  const idClient = usuario?.idClient;

  const [puntos, setPuntos] = useState<MisPuntos | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [idPedido, setIdPedido] = useState('');
  const [plan, setPlan] = useState<PlanRecompensa | null>(null);

  const cargar = useCallback(async () => {
    if (!idClient) {
      setCargando(false);
      return;
    }
    setCargando(true);
    setErrorCarga(null);
    try {
      const [p, m] = await Promise.all([traerMisPuntos(idClient), traerMovimientos(idClient)]);
      setPuntos(p);
      setMovimientos(m);
    } catch (e) {
      setErrorCarga(mensajeDeError(e, 'No se pudieron cargar tus puntos.'));
    } finally {
      setCargando(false);
    }
  }, [idClient]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function verPlan() {
    if (!idPedido) return;
    setErrorAccion(null);
    try {
      setPlan(await planDeCanje(Number(idPedido)));
    } catch (e) {
      setErrorAccion(mensajeDeError(e, 'No se pudo calcular el canje.'));
    }
  }

  if (!idClient) {
    return (
      <div className="vacio">
        <h1>Inicia sesión para ver tus puntos</h1>
        <Link to="/entrar" className="boton">Entrar</Link>
      </div>
    );
  }
  if (cargando) return <Cargando />;
  if (errorCarga) return <MensajeError mensaje={errorCarga} onReintentar={() => void cargar()} />;

  const progreso = puntos && puntos.pointsPerReward > 0
    ? Math.min(100, Math.round((puntos.balance / puntos.pointsPerReward) * 100))
    : 0;

  return (
    <>
      <div className="pagina__encabezado">
        <h1>Mis recompensas</h1>
        <p className="pagina__bajada">Cada pedido te acerca a tu próximo beneficio.</p>
      </div>

      <section className="puntos">
        <div className="puntos__saldo">
          <p className="puntos__etiqueta">Saldo actual</p>
          <strong className="numero puntos__numero">{puntos?.balance ?? 0}</strong>
          <p className="puntos__unidad">puntos</p>
          {puntos?.canRedeem && <span className="etiqueta etiqueta--verde">¡Puedes canjear!</span>}
        </div>
        <div className="puntos__progreso">
          <h2>Tu próxima recompensa</h2>
          <div className="barra-progreso">
            <div className="barra-progreso__relleno" style={{ width: `${progreso}%` }} />
          </div>
          <p className="pagina__bajada">
            {puntos
              ? `${puntos.balance} / ${puntos.pointsPerReward} puntos · te faltan ${puntos.missing}.`
              : 'Todavía no hay un programa de recompensas activo.'}
          </p>
          <p className="puntos__nota">El canje se aplica en tu próximo pedido desde la sección de pago.</p>
        </div>
      </section>

      <section className="seccion">
        <h2>Calcular canje de un pedido</h2>
        <div className="fila-busqueda">
          <select className="campo__control" value={idPedido} onChange={(e) => setIdPedido(e.target.value)}>
            <option value="">Elige un pedido…</option>
            {pedidos.map((p) => <option value={p.id} key={p.id}>Pedido #{p.id} · ${Number(p.total).toFixed(2)}</option>)}
          </select>
          <button className="boton" onClick={() => void verPlan()} disabled={!idPedido}>Calcular</button>
        </div>
        {errorAccion && <p className="aviso aviso--error">{errorAccion}</p>}
        {plan && (
          <p className="aviso aviso--exito">
            Se descontarán {plan.puntosADescontar} puntos. Saldo nuevo: {plan.saldoNuevo}.
          </p>
        )}
      </section>

      <section className="seccion">
        <h2>Movimientos</h2>
        {movimientos.length === 0 ? (
          <p className="vacio">Todavía no tienes movimientos de puntos. Haz un pedido para empezar a juntarlos.</p>
        ) : (
          <ul className="movimientos">
            {movimientos.map((m) => (
              <li className="movimiento" key={m.id}>
                <div>
                  <strong>{ETIQUETAS_MOVIMIENTO[m.transactionType]}</strong>
                  <p className="tarjeta__meta">
                    {new Date(m.createdAt).toLocaleDateString('es-MX')}
                    {m.idOrder ? ` · Pedido #${m.idOrder}` : ''}
                  </p>
                </div>
                <div className="movimiento__puntos">
                  <strong className={`numero ${m.pointsEarned >= 0 ? 'texto-verde' : 'texto-coral'}`}>
                    {m.pointsEarned > 0 ? '+' : ''}{m.pointsEarned}
                  </strong>
                  <small>Saldo: {m.balanceAfter}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
