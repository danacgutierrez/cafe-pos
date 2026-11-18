// Saldo, movimientos y vista previa de canje.
import { api } from '../../../compartido/api/api.ts';
import type { MisPuntos, Movimiento, PlanRecompensa } from '../../../compartido/api/tipos.ts';

// GET /rewards/clients/:idClient/points
export async function traerMisPuntos(idClient: number): Promise<MisPuntos> {
  const r = await api.get<MisPuntos>(`/rewards/clients/${idClient}/points`);
  return r.data;
}

// GET /rewards/clients/:idClient/movements
export async function traerMovimientos(idClient: number): Promise<Movimiento[]> {
  const r = await api.get<Movimiento[]>(`/rewards/clients/${idClient}/movements`);
  return r.data;
}

// POST /rewards/redemption-plan — no descunta puntos, sólo calcula.
export async function planDeCanje(idOrder: number): Promise<PlanRecompensa> {
  const r = await api.post<PlanRecompensa>('/rewards/redemption-plan', { idOrder });
  return r.data;
}
