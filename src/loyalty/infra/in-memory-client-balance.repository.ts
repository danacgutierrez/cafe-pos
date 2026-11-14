import { InsufficientBalanceError } from "../domain/errors";
import { ClientBalanceRepository } from "../domain/repositories/client-balance.repository";
import { UserRepository } from "../../user/domain/repositories/user.repository";
import { NotFoundError } from "../../shared/not-found-error";

/** Reads and writes Client.loyaltyBalance through the user repository. */
export class InMemoryClientBalanceRepository implements ClientBalanceRepository {
    constructor(private readonly users: UserRepository) { }

    async getBalance(clientId: string): Promise<number> {
        const client = await this.users.findById(clientId);
        if (!client || client.role !== "client") {
            throw new NotFoundError("Client", clientId);
        }
        return client.loyaltyBalance;
    }

    async change(clientId: string, amount: number): Promise<number> {
        const client = await this.users.findById(clientId);
        if (!client || client.role !== "client") {
            throw new NotFoundError("Client", clientId);
        }

        const balanceAfter = client.loyaltyBalance + amount;
        if (balanceAfter < 0) {
            throw new InsufficientBalanceError(client.id, -amount, client.loyaltyBalance);
        }

        await this.users.save({ ...client, loyaltyBalance: balanceAfter });
        return balanceAfter;
    }

    async countClientsWithBalance(): Promise<number> {
        return (await this.users.findAll()).filter((u) => u.role === "client" && u.loyaltyBalance > 0).length;
    }

    async resetAll(): Promise<number> {
        let reset = 0;
        for (const user of await this.users.findAll()) {
            if (user.role === "client" && user.loyaltyBalance > 0) {
                await this.users.save({ ...user, loyaltyBalance: 0 });
                reset++;
            }
        }
        return reset;
    }
}