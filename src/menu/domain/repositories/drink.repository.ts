import { Repository } from "../../../shared/repository";
import { Drink } from "../entities/drink.entity";

export interface DrinkRepository extends Repository<Drink> {
    findByTypeAndFlavor(drinkTypeId: string, flavorId: string): Promise<Drink | null>;

    // Separate from findAll() on purpose: this is the query the customer-facing catalog actually
    // uses often, so it's explicit here instead of always filtering findAll() in the service.
    findActive(): Promise<Drink[]>;

    findByName(name: string): Promise<Drink | null>;
}