import { Order, OrderStatus } from "../../../domain/order/entities/order.entity.js";
import { OrderDetail } from "../../../domain/order/entities/order-detail.entity.js";
import { OrderStatusHistory } from "../../../domain/order/entities/order-status-history.entity.js";
import { OrderRepository } from "../../../domain/order/ports/order-repository.js";

/**
 * In-memory implementation of {@link OrderRepository}.
 *
 * Meant for tests and local development; all data is lost when the process
 * ends. Every method stores and returns copies, so callers cannot mutate the
 * internal state without going through the repository.
 */
export class InMemoryOrderRepository implements OrderRepository {
    /** Order headers, indexed by order id. */
    private readonly orders = new Map<string, Order>();

    /** Order lines, indexed by order id. */
    private readonly details = new Map<string, OrderDetail[]>();

    /** Status change entries, indexed by order id. */
    private readonly histories = new Map<string, OrderStatusHistory[]>();

    /**
     * Finds an order by its identifier.
     *
     * @param id - Identifier of the order.
     * @returns A copy of the order, or `null` if it doesn't exist.
     */
    async findById(id: string): Promise<Order | null> {
        const order = this.orders.get(id);
        return order ? { ...order } : null;
    }

    /**
     * Returns all the stored orders.
     *
     * @returns A copy of every order.
     */
    async findAll(): Promise<Order[]> {
        return [...this.orders.values()].map((o) => ({ ...o }));
    }

    /**
     * Saves only the order header, without lines or history.
     * To create a new order use {@link createWithDetails} instead.
     *
     * @param order - Order to save (inserts or replaces).
     * @returns A copy of the saved order.
     */
    async save(order: Order): Promise<Order> {
        this.orders.set(order.id, { ...order });
        return { ...order };
    }

    /**
     * Removes an order together with its lines and status history.
     * Orders are part of the sales history, so services should not call this.
     *
     * @param id - Identifier of the order.
     */
    async delete(id: string): Promise<void> {
        this.orders.delete(id);
        this.details.delete(id);
        this.histories.delete(id);
    }

    /**
     * Creates an order together with its lines and its first history entry,
     * so all three are stored as a single unit.
     *
     * @param order - Order header.
     * @param details - Order lines.
     * @param history - First status history entry of the order.
     * @returns A copy of the created order.
     */
    async createWithDetails(
        order: Order,
        details: OrderDetail[],
        history: OrderStatusHistory,
    ): Promise<Order> {
        this.orders.set(order.id, { ...order });
        this.details.set(order.id, details.map((d) => ({ ...d })));
        this.histories.set(order.id, [{ ...history }]);
        return { ...order };
    }

    /**
     * Updates the status of an order and appends the change to its history.
     *
     * @param orderId - Identifier of the order.
     * @param history - History entry describing the new status and who changed it.
     * @throws {Error} If the order doesn't exist.
     */
    async updateStatus(orderId: string, history: OrderStatusHistory): Promise<void> {
        const order = this.orders.get(orderId);
        if (!order) {
            throw new Error(`Order ${orderId} doesn't exist`);
        }

        order.status = history.status;

        const entries = this.histories.get(orderId) ?? [];
        entries.push({ ...history });
        this.histories.set(orderId, entries);
    }

    /**
     * Finds all the orders placed by a client.
     *
     * @param clientId - Identifier of the client.
     * @returns A copy of each matching order.
     */
    async findByClient(clientId: string): Promise<Order[]> {
        return [...this.orders.values()]
            .filter((o) => o.idClient === clientId)
            .map((o) => ({ ...o }));
    }

    /**
     * Finds all the orders currently in the given status.
     *
     * @param status - Status to filter by.
     * @returns A copy of each matching order.
     */
    async findByStatus(status: OrderStatus): Promise<Order[]> {
        return [...this.orders.values()]
            .filter((o) => o.status === status)
            .map((o) => ({ ...o }));
    }

    /**
     * Finds the orders scheduled within a date range.
     *
     * @param from - Start of the range (inclusive).
     * @param to - End of the range (exclusive).
     * @returns A copy of each matching order, earliest scheduled first.
     */
    async findByScheduleRange(from: Date, to: Date): Promise<Order[]> {
        return [...this.orders.values()]
            .filter((o) => o.scheduleTime >= from && o.scheduleTime < to)
            .sort((a, b) => a.scheduleTime.getTime() - b.scheduleTime.getTime())
            .map((o) => ({ ...o }));
    }

    /**
     * Finds the lines of an order.
     *
     * @param orderId - Identifier of the order.
     * @returns A copy of each line, or an empty array if there are none.
     */
    async findDetails(orderId: string): Promise<OrderDetail[]> {
        return (this.details.get(orderId) ?? []).map((d) => ({ ...d }));
    }

    /**
     * Finds the status change history of an order.
     *
     * @param orderId - Identifier of the order.
     * @returns A copy of each entry, oldest first, or an empty array if there are none.
     */
    async findStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
        return (this.histories.get(orderId) ?? [])
            .map((h) => ({ ...h }))
            .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
    }
}