import { LoyaltyProgram } from "../entities/loyalty-program.entity.js";
import { LoyaltyTransaction } from "../entities/loyalty-transaction.entity.js";
import { Repository } from "../../shared/repository.js";

/**
 * Persistence contract for loyalty programs and their points transactions.
 *
 * Transactions are permanent records: they are only added through `record`
 * and are never edited or deleted.
 */
export interface LoyaltyRepository extends Repository<LoyaltyProgram> {
  /**
   * Finds the loyalty program that is currently running.
   *
   * @returns The active program, or `null` if there is none.
   */
  findActive(): Promise<LoyaltyProgram | null>;

  /**
   * Activates a program and deactivates the previous one atomically.
   * The previous program is kept, since past transactions reference it.
   *
   * @param programId - Identifier of the program to activate.
   */
  activate(programId: string): Promise<void>;

  /**
   * Stores a transaction and updates the client's balance atomically,
   * so two simultaneous operations cannot spend the same points.
   * Implementations must reject a transaction whose `balanceAfter` is negative.
   *
   * @param transaction - Transaction to record.
   * @returns The stored transaction.
   */
  record(transaction: LoyaltyTransaction): Promise<LoyaltyTransaction>;

  /**
   * Gets the current balance of a client.
   *
   * @param clientId - Identifier of the client.
   * @returns The balance, or 0 if the client has no transactions.
   */
  getBalance(clientId: string): Promise<number>;

  /**
   * Finds the transaction history of a client, newest first.
   *
   * @param clientId - Identifier of the client.
   */
  findByClient(clientId: string): Promise<LoyaltyTransaction[]>;

  /**
   * Finds the transactions originated by an order.
   *
   * @param orderId - Identifier of the order.
   */
  findByOrder(orderId: string): Promise<LoyaltyTransaction[]>;

  /**
   * Finds the "earn" transaction of a client within a date range, ignoring
   * transactions that were already reversed.
   *
   * @param clientId - Identifier of the client.
   * @param from - Start of the range (inclusive).
   * @param to - End of the range (exclusive).
   * @returns The transaction, or `null` if there is none in that range.
   */
  findEarnByClientInRange(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<LoyaltyTransaction | null>;
}