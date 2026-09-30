import { Order, OrderStatus } from "../entities/order.entity.js";
import { OrderDetail } from "../entities/order-detail.entity.js";
import { OrderStatusHistory } from "../entities/order-status-history.entity.js";
import { Repository } from "../../shared/repository.js";

/** Persistence contract for orders and their status history. */
export interface OrderRepository extends Repository<Order> {
  /**
   * Creates an order with its lines and first history entry atomically.
   * Prefer this over `save`, which would not guarantee at least one line (RN-09).
   */
  createWithDetails(order: Order, details: OrderDetail[], history: OrderStatusHistory): Promise<Order>;

  /** Updates the order status and inserts the history entry atomically. */
  updateStatus(orderId: string, history: OrderStatusHistory): Promise<void>;

  /** Finds all the orders placed by a client. */
  findByClient(clientId: string): Promise<Order[]>;

  /** Finds all the orders currently in the given status. */
  findByStatus(status: OrderStatus): Promise<Order[]>;

  /** Finds the orders scheduled between two dates. */
  findByScheduleRange(from: Date, to: Date): Promise<Order[]>;

  /** Finds the lines of an order. */
  findDetails(orderId: string): Promise<OrderDetail[]>;

  /** Finds the status change history of an order. */
  findStatusHistory(orderId: string): Promise<OrderStatusHistory[]>;
}