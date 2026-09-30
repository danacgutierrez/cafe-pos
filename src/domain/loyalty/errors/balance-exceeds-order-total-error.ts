import { DomainError } from "../../shared/domain-error.js";

/**
 * Thrown when a client tries to apply more balance than the order total.
 *
 * @param requested - Amount of balance the client wants to apply.
 * @param orderTotal - Total of the order.
 */
export class BalanceExceedsOrderTotalError extends DomainError {
  constructor(
    public readonly requested: number,
    public readonly orderTotal: number,
  ) {
    super(`Cannot apply ${requested} of balance to an order totaling ${orderTotal}`);
  }
}