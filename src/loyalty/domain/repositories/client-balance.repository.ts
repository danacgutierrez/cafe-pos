/**
 * The only door loyalty has to a client's balance (Client.loyaltyBalance).
 * There is no history: the balance is the single source of truth.
 */
export interface ClientBalanceRepository {
    /** Throws NotFoundError if the id is not a client. */
    getBalance(clientId: string): Promise<number>;
    /**
     * Adds `amount` (negative to remove) in a single atomic step, so two simultaneous
     * operations cannot spend the same balance. Returns the balance after the change.
     * Throws NotFoundError if the id is not a client, and InsufficientBalanceError if it would end below 0.
     */
    change(clientId: string, amount: number): Promise<number>;
    countClientsWithBalance(): Promise<number>;
    /** Sets every client's balance to 0 in one step. Returns how many clients had balance. */
    resetAll(): Promise<number>;
}