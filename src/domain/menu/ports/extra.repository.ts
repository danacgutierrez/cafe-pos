import { Repository } from "../../shared/repository.js";
import { Extra } from "../entities/extra.entity.js";

export interface ExtraRepository extends Repository<Extra> {
    findByName(name: string): Promise<Extra | null>;
}