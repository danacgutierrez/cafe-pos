// Pago del pedido y resumen de lo ya cubierto.
import { api } from '../../../compartido/api/api.ts';
import type { Pago, PaymentMethod, ResumenPago } from '../../../compartido/api/tipos.ts';

export interface DatosPago {
  idOrder: number;
  method: PaymentMethod;
  providerPaymentId?: string;
}

// CASH/TRANSFER se aprueban al registrar; CARD sin referencia entra en modo demo.
export async function pagar(datos: DatosPago): Promise<Pago> {
  const r = await api.post<Pago>('/payments', datos);
  return r.data;
}

// GET /payments/order/:idOrder/summary
export async function traerResumen(idOrder: number): Promise<ResumenPago> {
  const r = await api.get<ResumenPago>(`/payments/order/${idOrder}/summary`);
  return r.data;
}

// GET /payments/order/:idOrder — intentos de pago del pedido.
export async function traerPagos(idOrder: number): Promise<Pago[]> {
  const r = await api.get<Pago[]>(`/payments/order/${idOrder}`);
  return r.data;
}
