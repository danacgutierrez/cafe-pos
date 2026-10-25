import { LocationUsageChecker } from "../../location/domain/location-usage-checker";
import { UserRepository } from "../domain/repositories/user.repository";

/** The part of "is this location in use?" that belongs to staff. Orders and inventory will add theirs. */
export class StaffLocationUsageChecker implements LocationUsageChecker {
    constructor(private readonly users: UserRepository) { }

    isInUse(locationId: string): Promise<boolean> {
        return this.users.existsStaffByLocationId(locationId);
    }
}