import { Repository } from "../../../shared/repository";
import { Drink } from "../entities/drink.entity";

export interface DrinkRepository extends Repository<Drink> {
    findByTypeAndFlavor(drinkTypeId: string, flavorId: string): Promise<Drink | null>;

    findByName(name: string): Promise<Drink | null>;

    // "Is anything using this?" questions, asked before deleting an option.
    // They return a boolean on purpose: the real database can answer with a cheap COUNT.
    existsByDrinkTypeId(drinkTypeId: string): Promise<boolean>;
    existsByDrinkFlavorId(drinkFlavorId: string): Promise<boolean>;
    existsByAllowedSizeId(sizeId: string): Promise<boolean>;
    existsByAllowedMilkTypeId(milkTypeId: string): Promise<boolean>;
    existsByAllowedSweetenerId(sweetenerId: string): Promise<boolean>;
}
