import { DomainError } from "../../shared/domain-error.js";
import type { OrderStatus } from "../entities/order.entity.js";

/**
 * Thrown when an order status change skips a step or goes backwards.
 *
 * Statuses can only advance in order: received, in preparation, ready,
 * delivered. Otherwise the client would see false information and
 * preparation times would be measured incorrectly.
 *
 * @param from - The current status of the order.
 * @param to - The requested (invalid) status.
 */
export class InvalidStatusTransitionError extends DomainError {
  constructor(
    public readonly from: OrderStatus,
    public readonly to: OrderStatus,
  ) {
    super(`Cannot change order status from "${from}" to "${to}"`);
  }
}