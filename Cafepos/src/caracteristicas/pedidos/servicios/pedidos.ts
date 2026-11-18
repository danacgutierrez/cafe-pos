// Alta, historial, seguimiento y repetición de pedidos.
import { api } from '../../../compartido/api/api.ts';
import type { CrearPedido, EstadoPedido, Pedido, RepeticionPedido } from '../../../compartido/api/tipos.ts';

// POST /orders — el servidor exige idClient === el del token.
export async function crearPedido(dto: CrearPedido): Promise<Pedido> {
  const r = await api.post<Pedido>('/orders', dto);
  return r.data;
}

// GET /orders/mine — historial del cliente autenticado.
export async function traerMisPedidos(): Promise<Pedido[]> {
  const r = await api.get<Pedido[]>('/orders/mine');
  return r.data;
}

// GET /orders/:id/status — estado para dejar de preguntar por WhatsApp.
export async function traerEstado(id: number): Promise<EstadoPedido> {
  const r = await api.get<EstadoPedido>(`/orders/${id}/status`);
  return r.data;
}

// POST /orders/:id/repeat — calcula una repetición; no crea el pedido.
export async function repetirPedido(id: number): Promise<RepeticionPedido> {
  const r = await api.post<RepeticionPedido>(`/orders/${id}/repeat`);
  return r.data;
}

// PATCH /orders/:id/cancel — sólo mientras esté PENDING (RN-14).
export async function cancelarPedido(id: number): Promise<Pedido> {
  const r = await api.patch<Pedido>(`/orders/${id}/cancel`);
  return r.data;
}
