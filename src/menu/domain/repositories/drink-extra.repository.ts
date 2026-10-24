import { DrinkExtra } from "../entities/drink-extra.entity";

/**
 * Does not extend Repository<T>: a DrinkExtra has no id of its own,
 * and it is always read and written as the whole set of one drink.
 */
export interface DrinkExtraRepository {
    findAll(): Promise<DrinkExtra[]>;
    findByDrinkId(drinkId: string): Promise<DrinkExtra[]>;
    existsByExtraId(extraId: string): Promise<boolean>;

    /** Replaces ALL the extras of a drink with the given ones. */
    saveAll(drinkId: string, links: DrinkExtra[]): Promise<DrinkExtra[]>;
    deleteByDrinkId(drinkId: string): Promise<void>;
}
