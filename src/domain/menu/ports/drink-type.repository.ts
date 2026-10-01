import { Repository } from "../../shared/repository.js";
import { DrinkType } from "../entities/drink-type.entity.js";

export interface DrinkTypeRepository extends Repository<DrinkType> {
    findByName(name: string): Promise<DrinkType | null>;
}