import { DomainError } from "../../shared/domain-error.js";
import type { OrderStatus } from "../entities/order.entity.js";

/**
 * Thrown when trying to cancel an order that can no longer be cancelled.
 *
 * An order can only be cancelled while it is in the "received" status.
 * Once it is in preparation, ready or delivered, the ingredients have
 * already been used.
 *
 * @param currentStatus - The status the order is currently in.
 */
export class OrderNotCancellableError extends DomainError {
  constructor(public readonly currentStatus: OrderStatus) {
    super(`Order cannot be cancelled while in status "${currentStatus}"`);
  }
}