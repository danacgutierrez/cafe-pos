import { Repository } from "../../../shared/repository";
import { DrinkFlavor } from "../entities/drink-flavor.entity";

export interface DrinkFlavorRepository extends Repository<DrinkFlavor> {
    findByName(name: string): Promise<DrinkFlavor | null>;
}