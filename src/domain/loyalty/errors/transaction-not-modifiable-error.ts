import { DomainError } from "../../shared/domain-error.js";

/**
 * Thrown when trying to modify or delete a points transaction.
 *
 * Transactions are permanent records. Any correction must be registered
 * as a new adjustment.
 *
 * @param transactionId - Identifier of the transaction.
 */
export class TransactionNotModifiableError extends DomainError {
  constructor(public readonly transactionId: string) {
    super(`Transaction ${transactionId} cannot be modified or deleted`);
  }
}