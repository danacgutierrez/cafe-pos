// Etiquetas compartidas por historial, seguimiento y pagos.
import type { OrderStatus, PaymentStatus } from '../api/tipos.ts';

export const ETIQUETAS_ESTADO: Record<OrderStatus, string> = {
  PENDING: 'Recibido',
  IN_PROGRESS: 'En preparación',
  READY: 'Listo para recoger',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

export const PASOS: OrderStatus[] = ['PENDING', 'IN_PROGRESS', 'READY', 'COMPLETED'];

export function claseEstado(status: OrderStatus): string {
  return `estado--${status.toLowerCase()}`;
}

export function clasePago(status: PaymentStatus | undefined): string {
  return `estado estado--${(status ?? 'pending').toLowerCase()}`;
}
