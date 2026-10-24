import { Repository } from "../../../shared/repository";
import { Sweetener } from "../entities/sweetener.entity";

export interface SweetenerRepository extends Repository<Sweetener> {
    findByName(name: string): Promise<Sweetener | null>;
    findByLevel(level: number): Promise<Sweetener | null>;
}
