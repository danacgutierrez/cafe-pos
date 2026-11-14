import { LocationUsageChecker } from "../domain/location-usage-checker";

/** Joins the checks of every module (staff, orders, inventory...): a location is in use if ANY of them says so. */
export class CompositeLocationUsageChecker implements LocationUsageChecker {
    private readonly checkers: LocationUsageChecker[];

    constructor(...checkers: LocationUsageChecker[]) {
        this.checkers = checkers;
    }

    async isInUse(locationId: string): Promise<boolean> {
        for (const checker of this.checkers) {
            if (await checker.isInUse(locationId)) {
                return true;
            }
        }
        return false;
    }
}