import { Product } from '../../productos/dominio/entidades';
import { Beverage } from '../../menu/dominio/entidades';
import { OrderStatus } from '../../ordenes/dominio/entidades';
import { PedidoParaEstado } from './entidades';

export interface StatusRepository {
  findOrder(id: number): Promise<PedidoParaEstado | null>;
  findProduct(id: number): Promise<Product | null>;
  findBeverage(id: number): Promise<Beverage | null>;
  updateStatus(id: number, status: OrderStatus): Promise<PedidoParaEstado>;

  // RN-19/RN-24: un pedido con pago de tarjeta solo se prepara cuando
  // los pagos aprobados cubren el total.
  hasCardPayment(idOrder: number): Promise<boolean>;
  approvedTotal(idOrder: number): Promise<number>;
}

export const STATUS_REPOSITORY = 'STATUS_REPOSITORY';
