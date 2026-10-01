import { DomainError } from "../../shared/domain-error.js";
import type { OrderStatus } from "../entities/order.entity.js";

/**
 * Thrown when trying to modify an order that is already closed.
 *
 * Delivered and cancelled orders are part of the sales history and
 * must remain unchanged.
 *
 * @param currentStatus - The status the order is currently in.
 */
export class OrderNotModifiableError extends DomainError {
  constructor(public readonly currentStatus: OrderStatus) {
    super(`Order in status "${currentStatus}" cannot be modified`);
  }
}