import { DomainError } from "../../shared/domain-error.js";
import type { OrderStatus } from "../../order/entities/order.entity.js";

/**
 * Thrown when trying to grant points for an order that has not been
 * delivered or paid yet.
 *
 * Points are never granted when an order is created, so a cancelled order
 * cannot give away points.
 *
 * @param orderId - Identifier of the order.
 * @param currentStatus - The status the order is currently in.
 */
export class OrderNotEligibleForPointsError extends DomainError {
  constructor(
    public readonly orderId: string,
    public readonly currentStatus: OrderStatus,
  ) {
    super(`Order ${orderId} in status "${currentStatus}" cannot earn points yet`);
  }
}