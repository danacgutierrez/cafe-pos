import { randomUUID } from "crypto"
import { Location } from "./domain/entities/location.entity"
import { LocationRepository } from "./domain/repositories/location.repository"
import { LocationUsageChecker } from "./domain/location-usage-checker"
import { LocationInUseError } from "./domain/errors"
import { LOCATION_ADDRESS_MAX_LENGTH, LOCATION_NAME_MAX_LENGTH } from "./domain/limits"
import { normalizeText } from "../shared/normalize-text"
import { DuplicateNameError } from "../shared/duplicate-name-error"
import { NotFoundError } from "../shared/not-found-error"

export class LocationService {
    constructor(
        private readonly locations: LocationRepository,
        private readonly usage: LocationUsageChecker,
    ) { }

    /** Name and address are required; the name is unique ignoring case. */
    async createLocation(name: string, address: string): Promise<Location> {
        const normalizedName = normalizeText("name", name, LOCATION_NAME_MAX_LENGTH);
        const normalizedAddress = normalizeText("address", address, LOCATION_ADDRESS_MAX_LENGTH);
        await this.assertNameFree(normalizedName);

        return this.locations.save({ id: randomUUID(), name: normalizedName, address: normalizedAddress });
    }

    /** Same rules as creation; keeping its own name is not a duplicate. */
    async updateLocation(id: string, changes: { name?: string; address?: string }): Promise<Location> {
        const location = await this.getLocation(id);
        const updated: Location = { ...location };

        if (changes.name !== undefined) {
            updated.name = normalizeText("name", changes.name, LOCATION_NAME_MAX_LENGTH);
            await this.assertNameFree(updated.name, id);
        }
        if (changes.address !== undefined) {
            updated.address = normalizeText("address", changes.address, LOCATION_ADDRESS_MAX_LENGTH);
        }

        return this.locations.save(updated);
    }

    /** Blocked while staff, orders or inventory still reference the location. */
    async deleteLocation(id: string): Promise<void> {
        await this.getLocation(id);
        if (await this.usage.isInUse(id)) {
            throw new LocationInUseError(id);
        }
        await this.locations.delete(id);
    }

    async getLocation(id: string): Promise<Location> {
        const location = await this.locations.findById(id);
        if (!location) {
            throw new NotFoundError("Location", id);
        }
        return location;
    }

    listLocations(): Promise<Location[]> {
        return this.locations.findAll();
    }

    private async assertNameFree(name: string, exceptId?: string): Promise<void> {
        const found = await this.locations.findByName(name);
        if (found && found.id !== exceptId) {
            throw new DuplicateNameError("Location", name);
        }
    }
}