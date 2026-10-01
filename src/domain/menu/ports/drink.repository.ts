import { Repository } from "../../shared/repository.js";
import { Drink } from "../entities/drink.entity.js";

export interface DrinkRepository extends Repository<Drink> {
    findByTypeAndFlavor(drinkTypeId: string, flavorId: string): Promise<Drink | null>;
    findActive(): Promise<Drink[]>;
}