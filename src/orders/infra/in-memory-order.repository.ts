import { Order } from "../domain/entities/order.entity";
import { OrderRepository } from "../domain/repositories/order.repository";

/**
 * An order holds nested data (lines, extras, dates), so copies are deep: otherwise
 * changing what a read returned would silently change what is stored.
 */
export class InMemoryOrderRepository implements OrderRepository {
    private readonly data = new Map<string, Order>();

    async findById(id: string): Promise<Order | null> {
        const found = this.data.get(id);
        return found ? structuredClone(found) : null;
    }

    async findAll(): Promise<Order[]> {
        return [...this.data.values()].map((e) => structuredClone(e));
    }

    async save(entity: Order): Promise<Order> {
        this.data.set(entity.id, structuredClone(entity));
        return structuredClone(entity);
    }

    async delete(id: string): Promise<void> {
        this.data.delete(id);
    }

    /** Newest first. */
    async findByClientId(clientId: string): Promise<Order[]> {
        return this.sortedNewestFirst((order) => order.clientId === clientId);
    }

    /** Newest first. */
    async findByLocationId(locationId: string): Promise<Order[]> {
        return this.sortedNewestFirst((order) => order.locationId === locationId);
    }

    async existsByLocationId(locationId: string): Promise<boolean> {
        return [...this.data.values()].some((order) => order.locationId === locationId);
    }

    private sortedNewestFirst(matches: (order: Order) => boolean): Order[] {
        return [...this.data.values()]
            .filter(matches)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((e) => structuredClone(e));
    }
}