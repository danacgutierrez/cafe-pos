import { DrinkType } from "../../../domain/menu/entities/drink-type.entity.js";
import { DrinkTypeRepository } from "../../../domain/menu/ports/drink-type.repository.js";

export class InMemoryDrinkTypeRepository implements DrinkTypeRepository {
    private readonly data = new Map<string, DrinkType>();

    async findById(id: string): Promise<DrinkType | null> {
        const found = this.data.get(id);
        return found ? { ...found } : null;
    }

    async findAll(): Promise<DrinkType[]> {
        return [...this.data.values()].map((d) => ({ ...d }));
    }

    async save(entity: DrinkType): Promise<DrinkType> {
        this.data.set(entity.id, { ...entity });
        return { ...entity };
    }

    async delete(id: string): Promise<void> {
        this.data.delete(id);
    }

    async findByName(name: string): Promise<DrinkType | null> {
        const found = [...this.data.values()].find(
            (d) => d.name.toLowerCase() === name.toLowerCase(),
        );
        return found ? { ...found } : null;
    }

}