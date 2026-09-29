import { OrderRepository } from './order.repository';
import { Order } from './entidades';

export class InMemoryOrderRepository implements OrderRepository {
    private orders: Order[] = [];

    save(order: Order): void {
        this.orders.push(order);
        console.log(`[BD Memoria] Pedido guardado exitosamente. Total de pedidos: ${this.orders.length}`);
    }

    findAll(): Order[] {
        return this.orders;
    }
}