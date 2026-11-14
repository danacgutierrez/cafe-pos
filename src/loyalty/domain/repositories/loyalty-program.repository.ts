import { Repository } from "../../../shared/repository";
import { LoyaltyProgram } from "../entities/loyalty-program.entity";

export interface LoyaltyProgramRepository extends Repository<LoyaltyProgram> {
    findActive(): Promise<LoyaltyProgram | null>;
    /** Case-insensitive lookup. */
    findByName(name: string): Promise<LoyaltyProgram | null>;
    /** Makes this program the only active one, in a single atomic step. */
    activate(programId: string): Promise<void>;
}