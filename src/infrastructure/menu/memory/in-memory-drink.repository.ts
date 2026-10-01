import { Drink } from "../../../domain/menu/entities/drink.entity.js";
import { DrinkRepository } from "../../../domain/menu/ports/drink.repository.js";

export class InMemoryDrinkRepository implements DrinkRepository {
  private readonly data = new Map<string, Drink>();

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

  async delete(id: string): Promise<void> {
    this.data.delete(id);
  }

  async findByTypeAndFlavor(drinkTypeId: string, flavorId: string): Promise<Drink | null> {
    const found = [...this.data.values()].find(
      (d) => d.drinkTypeId === drinkTypeId && d.flavorId === flavorId,
    );
    return found ? { ...found } : null;
  }

  async findActive(): Promise<Drink[]> {
    return [...this.data.values()].filter((d) => d.isActive).map((d) => ({ ...d }));
  }
}