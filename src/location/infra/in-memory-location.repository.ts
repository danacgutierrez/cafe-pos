import { Location } from "../domain/entities/location.entity";
import { LocationRepository } from "../domain/repositories/location.repository";

export class InMemoryLocationRepository implements LocationRepository {
    private readonly data = new Map<string, Location>();

    async findById(id: string): Promise<Location | null> {
        const found = this.data.get(id);
        return found ? { ...found } : null;
    }

    async findAll(): Promise<Location[]> {
        return [...this.data.values()].map((e) => ({ ...e }));
    }

    async save(entity: Location): Promise<Location> {
        this.data.set(entity.id, { ...entity });
        return { ...entity };
    }

    async delete(id: string): Promise<void> {
        this.data.delete(id);
    }

    async findByName(name: string): Promise<Location | null> {
        const found = [...this.data.values()].find(
            (e) => e.name.toLowerCase() === name.toLowerCase(),
        );
        return found ? { ...found } : null;
    }
}