import { DrinkExtra } from "../domain/entities/drink-extra.entity";
import { DrinkExtraRepository } from "../domain/repositories/drink-extra.repository";

export class InMemoryDrinkExtraRepository implements DrinkExtraRepository {
    private readonly data = new Map<string, DrinkExtra[]>();

    async findAll(): Promise<DrinkExtra[]> {
        return [...this.data.values()].flat().map((l) => ({ ...l }));
    }

    async findByDrinkId(drinkId: string): Promise<DrinkExtra[]> {
        return (this.data.get(drinkId) ?? []).map((l) => ({ ...l }));
    }

    async existsByExtraId(extraId: string): Promise<boolean> {
        return [...this.data.values()].some((links) => links.some((l) => l.extraId === extraId));
    }

    async saveAll(drinkId: string, links: DrinkExtra[]): Promise<DrinkExtra[]> {
        this.data.set(drinkId, links.map((l) => ({ ...l })));
        return links.map((l) => ({ ...l }));
    }

    async deleteByDrinkId(drinkId: string): Promise<void> {
        this.data.delete(drinkId);
    }
}
