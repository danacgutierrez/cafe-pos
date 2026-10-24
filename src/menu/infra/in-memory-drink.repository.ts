import { Drink } from "../domain/entities/drink.entity";
import { DrinkRepository } from "../domain/repositories/drink.repository";

export class InMemoryDrinkRepository implements DrinkRepository {
    private readonly data = new Map<string, Drink>();

    // A plain { ...drink } would share the id lists with the stored one,
    // and changing a returned drink would silently change the "database".
    private copy(drink: Drink): Drink {
        return {
            ...drink,
            allowedSizeIds: [...drink.allowedSizeIds],
            allowedMilkTypeIds: [...drink.allowedMilkTypeIds],
            allowedSweetenerIds: [...drink.allowedSweetenerIds],
        };
    }

    async findByTypeAndFlavor(drinkTypeId: string, drinkFlavorId: string): Promise<Drink | null> {
        const found = [...this.data.values()].find(
            (d) => d.drinkTypeId === drinkTypeId && d.drinkFlavorId === drinkFlavorId,
        );
        return found ? this.copy(found) : null;
    }
    async findByName(name: string): Promise<Drink | null> {
        const found = [...this.data.values()].find(
            (d) => d.name.toLowerCase() === name.toLowerCase(),
        );
        return found ? this.copy(found) : null;
    }
    async findById(id: string): Promise<Drink | null> {
        const found = this.data.get(id);
        return found ? this.copy(found) : null;
    }
    async findAll(): Promise<Drink[]> {
        return [...this.data.values()].map((d) => this.copy(d));
    }
    async save(entity: Drink): Promise<Drink> {
        this.data.set(entity.id, this.copy(entity));
        return this.copy(entity);
    }
    async delete(id: string): Promise<void> {
        this.data.delete(id);
    }

    async existsByDrinkTypeId(drinkTypeId: string): Promise<boolean> {
        return [...this.data.values()].some((d) => d.drinkTypeId === drinkTypeId);
    }
    async existsByDrinkFlavorId(drinkFlavorId: string): Promise<boolean> {
        return [...this.data.values()].some((d) => d.drinkFlavorId === drinkFlavorId);
    }
    async existsByAllowedSizeId(sizeId: string): Promise<boolean> {
        return [...this.data.values()].some((d) => d.allowedSizeIds.includes(sizeId));
    }
    async existsByAllowedMilkTypeId(milkTypeId: string): Promise<boolean> {
        return [...this.data.values()].some((d) => d.allowedMilkTypeIds.includes(milkTypeId));
    }
    async existsByAllowedSweetenerId(sweetenerId: string): Promise<boolean> {
        return [...this.data.values()].some((d) => d.allowedSweetenerIds.includes(sweetenerId));
    }
}
