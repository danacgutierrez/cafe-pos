import { Repository } from "../../shared/repository.js";
import { Flavor } from "../entities/flavor.entity.js";

export interface FlavorRepository extends Repository<Flavor> {
    findByName(name: string): Promise<Flavor | null>
}