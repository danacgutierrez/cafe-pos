import { Sweetener } from "../domain/entities/sweetener.entity";
import { SweetenerRepository } from "../domain/repositories/sweetener.repository";

export class InMemorySweetenerRepository implements SweetenerRepository {
    private readonly data = new Map<string, Sweetener>();

    async findById(id: string): Promise<Sweetener | null> {
        const found = this.data.get(id);
        return found ? { ...found } : null;
    }

    async findAll(): Promise<Sweetener[]> {
        return [...this.data.values()].map((e) => ({ ...e }));
    }

    async save(entity: Sweetener): Promise<Sweetener> {
        this.data.set(entity.id, { ...entity });
        return { ...entity };
    }

    async delete(id: string): Promise<void> {
        this.data.delete(id);
    }

    async findByName(name: string): Promise<Sweetener | null> {
        const found = [...this.data.values()].find(
            (e) => e.name.toLowerCase() === name.toLowerCase(),
        );
        return found ? { ...found } : null;
    }

    async findByLevel(level: number): Promise<Sweetener | null> {
        const found = [...this.data.values()].find((e) => e.level === level);
        return found ? { ...found } : null;
    }
}
