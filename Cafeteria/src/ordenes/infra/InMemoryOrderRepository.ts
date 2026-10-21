import { OrderRepository } from '../dominio/order.repository';
import { Product } from '../../productos/dominio/entidades';
import { Order } from '../dominio/entidades';

export class InMemoryOrderRepository implements OrderRepository {
  private orders: Order[] = [];
  private orderIdCounter = 1;
  private detailIdCounter = 1;

  private products: Product[] = [
    { id: 1, name: 'Hamburguesa Clásica', price: 8.5, description: "", isActive: true},
    { id: 2, name: 'Papas Fritas', price: 3.0, description: "", isActive: true },
    { id: 3, name: 'Bebida Mediana', price: 2.0, description: "", isActive: true },
  ];

  async save(order: Order): Promise<Order> {
    if (!order.id) {
      order.id = this.orderIdCounter++;
    }

    if (order.orderDetails && order.orderDetails.length > 0) {
      order.orderDetails.forEach((detail) => {
        if (!detail.id) {
          detail.id = this.detailIdCounter++;
        }
      });
    }

    const existingIndex = this.orders.findIndex((o) => o.id === order.id);
    if (existingIndex !== -1) {
      this.orders[existingIndex] = order;
    } else {
      this.orders.push(order);
    }

    console.log(
      `[BD Memoria] Pedido #${order.id} guardado exitosamente. Total pedidos: ${this.orders.length}`,
    );

    return order;
  }

  async findAll(): Promise<Order[]> {
    return [...this.orders];
  }

  async findProduct(id: number): Promise<Product | null> {
    const product = this.products.find((p) => p.id === id);
    return product ?? null;
  }
}