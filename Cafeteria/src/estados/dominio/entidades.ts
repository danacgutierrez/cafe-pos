import { OrderStatus } from '../../ordenes/dominio/entidades';

// RN-12: recibido -> en preparación -> listo -> entregado.
// CANCELLED no pertenece a la cadena: solo se permite desde PENDING (RN-14).
export const TRANSICIONES: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
  [OrderStatus.IN_PROGRESS]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export const ETIQUETAS_ESTADO: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Recibido',
  [OrderStatus.IN_PROGRESS]: 'En preparación',
  [OrderStatus.READY]: 'Listo',
  [OrderStatus.COMPLETED]: 'Entregado',
  [OrderStatus.CANCELLED]: 'Cancelado',
};

export interface PedidoParaEstado {
  id: number;
  idClient: number;
  status: string;
  total: number;
  orderDetails: Array<{
    idProduct?: number;
    idBeverage?: number;
    quantity: number;
    price: number;
  }>;
}
