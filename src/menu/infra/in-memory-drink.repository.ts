import { Drink } from "../domain/entities/drink.entity";
import { DrinkRepository } from "../domain/repositories/drink.repository";

export class InMemoryDrinkRepository implements DrinkRepository {
    private readonly data = new Map<string, Drink>();

    async findByTypeAndFlavor(drinkTypeId: string, drinkFlavorId: string): Promise<Drink | null> {
        const found = [...this.data.values()].find(
            (d) => d.drinkTypeId === drinkTypeId && d.drinkFlavorId === drinkFlavorId,
        );
        return found ? { ...found } : null;
    }
    async findActive(): Promise<Drink[]> {
        throw new Error("Method not implemented.");
    }
    async findByName(name: string): Promise<Drink | null> {
        const found = [ ...this.data.values()].find(
            (d) => d.name.toLowerCase() === name.toLowerCase(),
        );
        return found ? { ...found } : null
    }
    async findById(id: string): Promise<Drink | null> {
        const found = this.data.get(id);
        return found ? { ...found } : null;
    }
    async findAll(): Promise<Drink[]> {
        return [...this.data.values()].map((d) => ({ ...d }));
    }
    async save(entity: Drink): Promise<Drink> {
        this.data.set(entity.id, { ...entity });
        return { ...entity };
    }

}
