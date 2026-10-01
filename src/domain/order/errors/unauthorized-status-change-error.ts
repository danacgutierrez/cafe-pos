import { DomainError } from "../../shared/domain-error.js";

/**
 * Thrown when a user without permission tries to change an order status.
 *
 * Only staff and the owner can change the status of an order;
 * clients cannot.
 */
export class UnauthorizedStatusChangeError extends DomainError {
  constructor() {
    super("Only staff or the owner can change the status of an order");
  }
}