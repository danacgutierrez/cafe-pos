import { LoyaltyProgram } from "../../../domain/loyalty/entities/loyalty-program.entity.js";
import { LoyaltyTransaction } from "../../../domain/loyalty/entities/loyalty-transaction.entity.js";
import { LoyaltyRepository } from "../../../domain/loyalty/ports/loyalty-repository.js";
import { InsufficientPointsError } from "../../../domain/loyalty/errors/insufficient-points-error.js";

/**
 * In-memory implementation of {@link LoyaltyRepository}.
 *
 * Meant for tests and local development; all data is lost when the process
 * ends. Every method stores and returns copies, so callers cannot mutate the
 * internal state without going through the repository.
 */
export class InMemoryLoyaltyRepository implements LoyaltyRepository {
    /** Loyalty programs, indexed by program id. */
    private readonly programs = new Map<string, LoyaltyProgram>();

    /** Recorded transactions, in the order they were stored. */
    private readonly transactions: LoyaltyTransaction[] = [];

    /** Current balance of each client, indexed by client id. */
    private readonly balances = new Map<string, number>();

    /**
     * Finds a program by its identifier.
     *
     * @param id - Identifier of the program.
     * @returns A copy of the program, or `null` if it doesn't exist.
     */
    async findById(id: string): Promise<LoyaltyProgram | null> {
        const program = this.programs.get(id);
        return program ? { ...program } : null;
    }

    /**
     * Returns all the stored programs, active or not.
     *
     * @returns A copy of every program.
     */
    async findAll(): Promise<LoyaltyProgram[]> {
        return [...this.programs.values()].map((p) => ({ ...p }));
    }

    /**
     * Saves a program (inserts or replaces).
     * To start a program use {@link activate}, which keeps a single active one.
     *
     * @param program - Program to save.
     * @returns A copy of the saved program.
     */
    async save(program: LoyaltyProgram): Promise<LoyaltyProgram> {
        this.programs.set(program.id, { ...program });
        return { ...program };
    }

    /**
     * Not supported: programs are referenced by past transactions and must
     * be kept. Deactivate them with {@link activate} on another program.
     *
     * @throws {Error} Always.
     */
    async delete(id: string): Promise<void> {
        throw new Error(`Loyalty program ${id} cannot be deleted, transactions reference it`);
    }

    /**
     * Finds the program that is currently running.
     *
     * @returns A copy of the active program, or `null` if there is none.
     */
    async findActive(): Promise<LoyaltyProgram | null> {
        const active = [...this.programs.values()].find((p) => p.isActive);
        return active ? { ...active } : null;
    }

    /**
     * Activates a program and deactivates every other one, which are kept.
     *
     * @param programId - Identifier of the program to activate.
     * @throws {Error} If the program doesn't exist.
     */
    async activate(programId: string): Promise<void> {
        if (!this.programs.has(programId)) {
            throw new Error(`Loyalty program ${programId} doesn't exist`);
        }

        for (const program of this.programs.values()) {
            program.isActive = program.id === programId;
        }
    }

    /**
     * Stores a transaction and updates the balance of the client as a single unit.
     *
     * @param transaction - Transaction to record.
     * @returns A copy of the stored transaction.
     * @throws {InsufficientPointsError} If the balance would become negative.
     * @throws {Error} If `balanceAfter` doesn't match the current balance plus
     * the amount, which means the balance changed after the caller read it.
     */
    async record(transaction: LoyaltyTransaction): Promise<LoyaltyTransaction> {
        const current = this.balances.get(transaction.clientId) ?? 0;

        if (transaction.balanceAfter < 0) {
            throw new InsufficientPointsError(transaction.clientId, -transaction.amount, current);
        }

        if (Math.abs(current + transaction.amount - transaction.balanceAfter) > 1e-9) {
            throw new Error(
                `Balance of client ${transaction.clientId} changed concurrently: ` +
                    `expected ${transaction.balanceAfter - transaction.amount}, current ${current}`,
            );
        }

        this.transactions.push({ ...transaction });
        this.balances.set(transaction.clientId, transaction.balanceAfter);
        return { ...transaction };
    }

    /**
     * Gets the current balance of a client.
     *
     * @param clientId - Identifier of the client.
     * @returns The balance, or 0 if the client has no transactions.
     */
    async getBalance(clientId: string): Promise<number> {
        return this.balances.get(clientId) ?? 0;
    }

    /**
     * Finds the transaction history of a client.
     *
     * @param clientId - Identifier of the client.
     * @returns A copy of each transaction, newest first.
     */
    async findByClient(clientId: string): Promise<LoyaltyTransaction[]> {
        return this.transactions
            .filter((t) => t.clientId === clientId)
            .map((t) => ({ ...t }))
            .reverse();
    }

    /**
     * Finds the transactions originated by an order.
     *
     * @param orderId - Identifier of the order.
     * @returns A copy of each transaction, oldest first.
     */
    async findByOrder(orderId: string): Promise<LoyaltyTransaction[]> {
        return this.transactions
            .filter((t) => t.orderId === orderId)
            .map((t) => ({ ...t }));
    }

    /**
     * Finds an "earn" transaction of a client within a date range.
     *
     * @param clientId - Identifier of the client.
     * @param from - Start of the range (inclusive).
     * @param to - End of the range (exclusive).
     * @returns A copy of the transaction, or `null` if there is none in that range.
     */
    async findEarnByClientInRange(
        clientId: string,
        from: Date,
        to: Date,
    ): Promise<LoyaltyTransaction | null> {
        const found = this.transactions.find(
            (t) =>
                t.clientId === clientId &&
                t.transactionType === "earn" &&
                t.createdAt >= from &&
                t.createdAt < to,
        );
        return found ? { ...found } : null;
    }
}