import { DrinkFlavor } from "../domain/entities/drink-flavor.entity";
import { DrinkFlavorRepository } from "../domain/repositories/drink-flavor.repository";

export class InMemoryDrinkFlavorRepository implements DrinkFlavorRepository {
    private readonly data = new Map<string, DrinkFlavor>();

    async findByName(name: string): Promise<DrinkFlavor | null> {
        const found = [...this.data.values()].find(
            (f) => f.name.toLowerCase() === name.toLowerCase(),
        );
        return found ? { ...found } : null;
    }
    async findById(id: string): Promise<DrinkFlavor | null> {
        const found = this.data.get(id);
        return found ? { ...found } : null;
    }
    async findAll(): Promise<DrinkFlavor[]> {
        return [...this.data.values()].map((f) => ({ ...f }));
    }
    async save(entity: DrinkFlavor): Promise<DrinkFlavor> {
        this.data.set(entity.id, { ...entity });
        return { ...entity };
    }

}