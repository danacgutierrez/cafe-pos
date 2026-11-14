import { Repository } from "../../../shared/repository";
import { Order } from "../entities/order.entity";

/**
 * Orders are never deleted: they are the history (what was sold, what loyalty gave).
 * `delete` comes from Repository, but the service never calls it; cancelling is how an order leaves the flow.
 */
export interface OrderRepository extends Repository<Order> {
    findByClientId(clientId: string): Promise<Order[]>;
    findByLocationId(locationId: string): Promise<Order[]>;
    /** "Is anything using this?" question, asked before deleting a location. */
    existsByLocationId(locationId: string): Promise<boolean>;
}