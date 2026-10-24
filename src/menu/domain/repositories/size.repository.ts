import { Repository } from "../../../shared/repository";
import { Size } from "../entities/size.entity";

export interface SizeRepository extends Repository<Size> {
    findByName(name: string): Promise<Size | null>;
}
