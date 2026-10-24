import { DrinkType } from "../domain/entities/drink-type.entity";
import { DrinkTypeRepository } from "../domain/repositories/drink-type.repository";

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

    async findByName(name: string): Promise<DrinkType | null> {
        const found = [...this.data.values()].find(
            (d) => d.name.toLowerCase() === name.toLowerCase(),
        );
        return found ? { ...found } : null;
    }
}