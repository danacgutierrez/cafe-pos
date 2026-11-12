import { OrderRepository } from './order.repository';
import { Order } from './entidades';

export class InMemoryOrderRepository implements OrderRepository {
    private orders: Order[] = [];
    private nextId: number = 1;

    save(order: Order): void {
        if (this.orders.includes(order)) {
            throw new Error("Este pedido ya fue guardado.");
        }

        order.id = this.nextId;
        this.nextId++;

        this.orders.push(order);

        console.log(
            `[BD Memoria] Pedido #${order.id} guardado exitosamente. Total de pedidos: ${this.orders.length}`
        );
    }

    findAll(): Order[] {
        return [...this.orders];
    }
}