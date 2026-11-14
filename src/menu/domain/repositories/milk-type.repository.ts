import { Repository } from "../../../shared/repository";
import { MilkType } from "../entities/milk-type.entity";

export interface MilkTypeRepository extends Repository<MilkType> {
    findByName(name: string): Promise<MilkType | null>;
}
