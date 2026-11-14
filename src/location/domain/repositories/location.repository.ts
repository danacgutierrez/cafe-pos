import { Repository } from "../../../shared/repository";
import { Location } from "../entities/location.entity";

export interface LocationRepository extends Repository<Location> {
    /** Case-insensitive lookup. */
    findByName(name: string): Promise<Location | null>;
}