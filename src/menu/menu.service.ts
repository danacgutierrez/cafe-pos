import { randomUUID } from "crypto"
import { DrinkType } from "./domain/entities/drink-type.entity"
import { DrinkFlavorRepository } from "./domain/repositories/drink-flavor.repository"
import { DrinkTypeRepository } from "./domain/repositories/drink-type.repository"
import { DrinkRepository } from "./domain/repositories/drink.repository"
import { DrinkFlavor } from "./domain/entities/drink-flavor.entity"
import { Drink } from "./domain/entities/drink.entity"
import { InvalidInputError } from "../shared/invalid-input-error"
import { DuplicateNameError } from "../shared/duplicate-name-error"
import { NotFoundError } from "../shared/not-found-error"
import { DuplicateDrinkError, InactiveOptionError } from "./domain/errors"
import { DESCRIPTION_MAX_LENGTH, IMAGE_URL_MAX_LENGTH, MAX_PRICE_CENTS, NAME_MAX_LENGTH } from "./domain/limits"

/** The minimum a repository must offer to be activated or deactivated. */
interface ActivatableRepository<T extends { id: string; isActive: boolean }> {
    findById(id: string): Promise<T | null>;
    save(entity: T): Promise<T>;
}

export class MenuService {
    constructor(
        private readonly drinks: DrinkRepository,
        private readonly drinkTypes: DrinkTypeRepository,
        private readonly drinkFlavors: DrinkFlavorRepository,
    ) { }

    async activateDrinkType(id: string): Promise<DrinkType> {
        return this.setActive(this.drinkTypes, "DrinkType", id, true);
    }

    async deactivateDrinkType(id: string): Promise<DrinkType> {
        return this.setActive(this.drinkTypes, "DrinkType", id, false);
    }

    async activateDrinkFlavor(id: string): Promise<DrinkFlavor> {
        return this.setActive(this.drinkFlavors, "DrinkFlavor", id, true);
    }

    async deactivateDrinkFlavor(id: string): Promise<DrinkFlavor> {
        return this.setActive(this.drinkFlavors, "DrinkFlavor", id, false);
    }

    /** A drink can only be activated while its type and flavor are active. */
    async activateDrink(id: string): Promise<Drink> {
        const drink = await this.drinks.findById(id);
        if (!drink) {
            throw new NotFoundError("Drink", id);
        }
        if (drink.isActive) {
            return drink;
        }

        const type = await this.drinkTypes.findById(drink.drinkTypeId);
        if (!type) {
            throw new NotFoundError("DrinkType", drink.drinkTypeId);
        }
        if (!type.isActive) {
            throw new InactiveOptionError("DrinkType", type.id);
        }

        const flavor = await this.drinkFlavors.findById(drink.drinkFlavorId);
        if (!flavor) {
            throw new NotFoundError("DrinkFlavor", drink.drinkFlavorId);
        }
        if (!flavor.isActive) {
            throw new InactiveOptionError("DrinkFlavor", flavor.id);
        }

        return this.drinks.save({ ...drink, isActive: true });
    }

    async deactivateDrink(id: string): Promise<Drink> {
        return this.setActive(this.drinks, "Drink", id, false);
    }

    async createDrinkType(name: string, priceCents: number): Promise<DrinkType> {

        const normalizedName = this.normalizeName(name);
        this.assertValidPrice(priceCents);

        const existing = await this.drinkTypes.findByName(normalizedName);
        if (existing) {
            throw new DuplicateNameError("DrinkType", normalizedName);
        }

        return this.drinkTypes.save({ id: randomUUID(), name: normalizedName, isActive: true, priceCents });
    }

    async createDrinkFlavor(name: string, priceCents: number): Promise<DrinkFlavor> {
        const normalizedName = this.normalizeName(name);
        this.assertValidPrice(priceCents);

        const existing = await this.drinkFlavors.findByName(normalizedName);
        if (existing) {
            throw new DuplicateNameError("DrinkFlavor", normalizedName);
        }

        return this.drinkFlavors.save({ id: randomUUID(), name: normalizedName, isActive: true, priceCents });
    }

    async createDrink(name: string, description: string, drinkTypeId: string, drinkFlavorId: string, imageUrl?: string): Promise<Drink> {
        const normalizedName = this.normalizeName(name);
        description = description.trim();

        if (description === "" || description.length > DESCRIPTION_MAX_LENGTH) {
            throw new InvalidInputError("description", `cannot be empty or longer than ${DESCRIPTION_MAX_LENGTH} characters`);
        }

        const cleanImageUrl = imageUrl?.trim() || undefined;
        if (cleanImageUrl !== undefined) {
            if (cleanImageUrl.length > IMAGE_URL_MAX_LENGTH) {
                throw new InvalidInputError("imageUrl", `must be at most ${IMAGE_URL_MAX_LENGTH} characters`);
            }
            let parsed: URL;
            try {
                parsed = new URL(cleanImageUrl);
            } catch {
                throw new InvalidInputError("imageUrl", "must be a valid URL");
            }
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                throw new InvalidInputError("imageUrl", "must use http or https");
            }
        }

        const existingType = await this.drinkTypes.findById(drinkTypeId);
        if (!existingType) {
            throw new NotFoundError("DrinkType", drinkTypeId);
        }

        if (!existingType.isActive) {
            throw new InactiveOptionError("DrinkType", drinkTypeId);
        }

        const existingFlavor = await this.drinkFlavors.findById(drinkFlavorId);
        if (!existingFlavor) {
            throw new NotFoundError("DrinkFlavor", drinkFlavorId);
        }

        if (!existingFlavor.isActive) {
            throw new InactiveOptionError("DrinkFlavor", drinkFlavorId);
        }

        const existingDrinkName = await this.drinks.findByName(normalizedName);
        if (existingDrinkName) {
            throw new DuplicateNameError("Drink", normalizedName);
        }

        const existingDrink = await this.drinks.findByTypeAndFlavor(drinkTypeId, drinkFlavorId);
        if (existingDrink) {
            throw new DuplicateDrinkError(drinkTypeId, drinkFlavorId);
        }

        const priceCents = existingType.priceCents + existingFlavor.priceCents;


        return this.drinks.save({ id: randomUUID(), name: normalizedName, priceCents, description, isActive: true, imageUrl: cleanImageUrl, drinkTypeId, drinkFlavorId });
    }

    /** Drinks that can really be ordered: the drink, its type and its flavor are all active. */
    async listAvailableDrinks(): Promise<Drink[]> {
        const [drinks, types, flavors] = await Promise.all([
            this.drinks.findAll(),
            this.drinkTypes.findAll(),
            this.drinkFlavors.findAll(),
        ]);
        const typesById = new Map(types.map((t) => [t.id, t] as const));
        const flavorsById = new Map(flavors.map((f) => [f.id, f] as const));

        return drinks.filter((drink) =>
            this.isAvailable(drink, typesById.get(drink.drinkTypeId), flavorsById.get(drink.drinkFlavorId)),
        );
    }


    /** -------------------------------------------- HELPERS -------------------------------------------- */
    private async setActive<T extends { id: string; isActive: boolean }>(
        repository: ActivatableRepository<T>,
        entityName: string,
        id: string,
        isActive: boolean,
    ): Promise<T> {
        const entity = await repository.findById(id);
        if (!entity) {
            throw new NotFoundError(entityName, id);
        }
        if (entity.isActive === isActive) {
            return entity;
        }
        return repository.save({ ...entity, isActive });
    }

    /** The single place that defines when a drink is available. */
    private isAvailable(
        drink: Drink,
        type: DrinkType | undefined,
        flavor: DrinkFlavor | undefined,
    ): boolean {
        return drink.isActive && type?.isActive === true && flavor?.isActive === true;
    }

    private normalizeName(name: string): string {
        const clean = name.normalize("NFC").trim().replace(/\s+/g, " ");

        if (clean === "") {
            throw new InvalidInputError("name", "cannot be empty");
        }
        if (clean.length > NAME_MAX_LENGTH) {
            throw new InvalidInputError("name", `cannot be longer than ${NAME_MAX_LENGTH} characters`);
        }

        return clean;
    }

    private assertValidPrice(priceCents: number): void {
        if (!Number.isInteger(priceCents)) {
            throw new InvalidInputError("priceCents", "must be a whole number of cents");
        }
        if (priceCents < 0) {
            throw new InvalidInputError("priceCents", "cannot be negative");
        }
        if (priceCents > MAX_PRICE_CENTS) {
            throw new InvalidInputError("priceCents", `cannot exceed ${MAX_PRICE_CENTS} cents`);
        }
    }

}