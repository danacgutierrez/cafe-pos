/** The reason a client's balance changed. */
export type TransactionType = "earn" | "redeem" | "adjustment" | "refund";

/** A record of a change in the balance of a client. */
export interface LoyaltyTransaction {
  /** Unique identifier of the transaction. */
  readonly id: string;

  /** Identifier of the loyalty program that applied to this transaction. */
  readonly loyaltyProgramId: string;

  /** Identifier of the client whose balance changed. */
  readonly clientId: string;

  /** Identifier of the order that originated the transaction, if any. */
  readonly orderId?: string;

  /** Identifier of the redemption this transaction returns. Only present in refunds. */
  readonly refundedTransactionId?: string;

  /** Why a manual adjustment was made. Only present in adjustments. */
  readonly reason?: string;

  /** Identifier of the user responsible for a manual adjustment. Only present in adjustments. */
  readonly changedById?: string;

  /**
   * Amount added (positive) or deducted (negative) by this transaction.
   * The unit depends on the program: points for per-visit programs,
   * money for percentage programs.
   */
  amount: number;

  /** Balance of the client right after this transaction, in the same unit as `amount`. */
  balanceAfter: number;

  /** Why the balance changed. */
  transactionType: TransactionType;

  /** Date and time the transaction was recorded. */
  createdAt: Date;
}