import { Flavor } from "../../../domain/menu/entities/flavor.entity.js";
import { FlavorRepository } from "../../../domain/menu/ports/flavor.repository.js";

export class InMemoryFlavorRepository implements FlavorRepository {
    private readonly data = new Map<string, Flavor>();

    async findById(id: string): Promise<Flavor | null> {
        const found = this.data.get(id);
        return found ? { ...found } : null;
    }

    async findAll(): Promise<Flavor[]> {
        return [...this.data.values()].map((f) => ({ ...f }));
    }

    async save(entity: Flavor): Promise<Flavor> {
        this.data.set(entity.id, { ...entity });
        return { ...entity };
    }

    async delete(id: string): Promise<void> {
        this.data.delete(id);
    }

    async findByName(name: string): Promise<Flavor | null> {
        const found = [...this.data.values()].find(
            (f) => f.name.toLowerCase() === name.toLowerCase(),
        );
        return found ? { ...found } : null;
    }
}