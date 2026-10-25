import { LoyaltyProgram } from "../domain/entities/loyalty-program.entity";
import { LoyaltyProgramRepository } from "../domain/repositories/loyalty-program.repository";

export class InMemoryLoyaltyProgramRepository implements LoyaltyProgramRepository {
    private readonly data = new Map<string, LoyaltyProgram>();

    async findById(id: string): Promise<LoyaltyProgram | null> {
        const found = this.data.get(id);
        return found ? { ...found } : null;
    }

    async findAll(): Promise<LoyaltyProgram[]> {
        return [...this.data.values()].map((e) => ({ ...e }));
    }

    async save(entity: LoyaltyProgram): Promise<LoyaltyProgram> {
        this.data.set(entity.id, { ...entity });
        return { ...entity };
    }

    async delete(id: string): Promise<void> {
        this.data.delete(id);
    }

    async findActive(): Promise<LoyaltyProgram | null> {
        const found = [...this.data.values()].find((e) => e.isActive);
        return found ? { ...found } : null;
    }

    async findByName(name: string): Promise<LoyaltyProgram | null> {
        const found = [...this.data.values()].find(
            (e) => e.name.toLowerCase() === name.toLowerCase(),
        );
        return found ? { ...found } : null;
    }

    async activate(programId: string): Promise<void> {
        for (const [id, program] of this.data) {
            this.data.set(id, { ...program, isActive: id === programId });
        }
    }
}