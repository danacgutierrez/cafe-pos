import { Repository } from "../../../shared/repository";
import { Extra } from "../entities/extra.entity";

export interface ExtraRepository extends Repository<Extra> {
    findByName(name: string): Promise<Extra | null>;
}
