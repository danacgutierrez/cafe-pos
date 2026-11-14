import { LocationUsageChecker } from "../../location/domain/location-usage-checker";
import { OrderRepository } from "../domain/repositories/order.repository";

/** The part of "is this location in use?" that belongs to orders. */
export class OrderLocationUsageChecker implements LocationUsageChecker {
    constructor(private readonly orders: OrderRepository) { }

    isInUse(locationId: string): Promise<boolean> {
        return this.orders.existsByLocationId(locationId);
    }
}