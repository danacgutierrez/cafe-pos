import { DomainError } from "../../shared/domain-error.js";

/**
 * Thrown when trying to create an order that has no items.
 *
 * An order must contain at least one product (currently drinks, but the
 * rule applies to any product type). An order without items has nothing
 * to prepare or charge for.
 */
export class EmptyOrderError extends DomainError {
  constructor() {
    super("An order must contain at least one item");
  }
}