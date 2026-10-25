import { Repository } from "../../../shared/repository";
import { User, UserRole } from "../entities/user.entity";

export interface UserRepository extends Repository<User> {
    /** Case-insensitive lookup. */
    findByUsername(username: string): Promise<User | null>;
    /** Case-insensitive lookup. */
    findByEmail(email: string): Promise<User | null>;
    existsByRole(role: UserRole): Promise<boolean>;
    existsStaffByLocationId(locationId: string): Promise<boolean>;
}