import { randomUUID } from "crypto"
import { DrinkType } from "./domain/entities/drink-type.entity"
import { DrinkFlavor } from "./domain/entities/drink-flavor.entity"
import { Drink } from "./domain/entities/drink.entity"
import { Size } from "./domain/entities/size.entity"
import { MilkType } from "./domain/entities/milk-type.entity"
import { Extra } from "./domain/entities/extra.entity"
import { DrinkRepository } from "./domain/repositories/drink.repository"
import { DrinkTypeRepository } from "./domain/repositories/drink-type.repository"
import { DrinkFlavorRepository } from "./domain/repositories/drink-flavor.repository"
import { SizeRepository } from "./domain/repositories/size.repository"
import { MilkTypeRepository } from "./domain/repositories/milk-type.repository"
import { SweetenerRepository } from "./domain/repositories/sweetener.repository"
import { ExtraRepository } from "./domain/repositories/extra.repository"
import { CreateDrinkInput } from "./domain/models/create-drink-input"
import { DrinkWithPrice, IncludedExtra } from "./domain/models/drink-with-price"
import { InvalidInputError } from "../shared/invalid-input-error"
import { DuplicateNameError } from "../shared/duplicate-name-error"
import { NotFoundError } from "../shared/not-found-error"
import {
    DrinkWithoutSizesError,
    DuplicateDrinkError,
    ExtraQuantityExceededError,
    InactiveOptionError,
} from "./domain/errors"
import { DESCRIPTION_MAX_LENGTH, IMAGE_URL_MAX_LENGTH, MAX_EXTRA_QUANTITY } from "./domain/limits"
import { assertIntegerInRange, assertNoRepeats, assertValidTotalPrice, normalizeName } from "./domain/validation"
import { setActive } from "./domain/activation"

/** Everything the menu needs to price drinks and decide their availability, loaded once per query. */
interface MenuLookups {
    types: Map<string, DrinkType>;
    flavors: Map<string, DrinkFlavor>;
    sizes: Map<string, Size>;
    milkTypes: Map<string, MilkType>;
    extras: Map<string, Extra>;
}

/**
 * Drinks: creating them with the options they allow, turning them on/off,
 * deleting them and reading them with their price and availability.
 * The catalogs a drink is built from are handled by MenuOptionsService.
 */
export class MenuService {
    constructor(
        private readonly drinks: DrinkRepository,
        private readonly drinkTypes: DrinkTypeRepository,
        private readonly drinkFlavors: DrinkFlavorRepository,
        private readonly sizes: SizeRepository,
        private readonly milkTypes: MilkTypeRepository,
        private readonly sweeteners: SweetenerRepository,
        private readonly extras: ExtraRepository,
    ) { }

    /** -------------------------------------------- DRINKS -------------------------------------------- */

    async createDrink(input: CreateDrinkInput): Promise<DrinkWithPrice> {
        const normalizedName = normalizeName(input.name);
        const description = input.description.trim();
        const sizeIds = input.sizeIds;
        const milkTypeIds = input.milkTypeIds ?? [];
        const sweetenerIds = input.sweetenerIds ?? [];
        const extraInputs = input.extras ?? [];

        if (description === "" || description.length > DESCRIPTION_MAX_LENGTH) {
            throw new InvalidInputError("description", `cannot be empty or longer than ${DESCRIPTION_MAX_LENGTH} characters`);
        }
        const imageUrl = this.cleanImageUrl(input.imageUrl);

        assertNoRepeats("sizeIds", sizeIds);
        assertNoRepeats("milkTypeIds", milkTypeIds);
        assertNoRepeats("sweetenerIds", sweetenerIds);
        assertNoRepeats("extras", extraInputs.map((e) => e.extraId));
        for (const extra of extraInputs) {
            assertIntegerInRange("includedQuantity", extra.includedQuantity, 0, MAX_EXTRA_QUANTITY);
        }

        if (sizeIds.length === 0) {
            throw new DrinkWithoutSizesError();
        }

        // Everything the drink points to must exist and be active.
        const type = await this.requireActive(this.drinkTypes, "DrinkType", input.drinkTypeId);
        const flavor = await this.requireActive(this.drinkFlavors, "DrinkFlavor", input.drinkFlavorId);
        for (const id of sizeIds) {
            await this.requireActive(this.sizes, "Size", id);
        }
        for (const id of milkTypeIds) {
            await this.requireActive(this.milkTypes, "MilkType", id);
        }
        for (const id of sweetenerIds) {
            await this.requireActive(this.sweeteners, "Sweetener", id);
        }
        for (const item of extraInputs) {
            const extra = await this.requireActive(this.extras, "Extra", item.extraId);
            if (item.includedQuantity > extra.maxQuantity) {
                throw new ExtraQuantityExceededError(extra.id, item.includedQuantity, extra.maxQuantity);
            }
        }

        if (await this.drinks.findByName(normalizedName)) {
            throw new DuplicateNameError("Drink", normalizedName);
        }
        if (await this.drinks.findByTypeAndFlavor(type.id, flavor.id)) {
            throw new DuplicateDrinkError(type.id, flavor.id);
        }

        assertValidTotalPrice(this.calculateDrinkPrice(type, flavor));

        const drink = await this.drinks.save({
            id: randomUUID(),
            name: normalizedName,
            description,
            isActive: true,
            imageUrl,
            drinkTypeId: type.id,
            drinkFlavorId: flavor.id,
            allowedSizeIds: [...sizeIds],
            allowedMilkTypeIds: [...milkTypeIds],
            allowedSweetenerIds: [...sweetenerIds],
            extras: extraInputs.map((e) => ({ extraId: e.extraId, includedQuantity: e.includedQuantity })),
        });

        return this.getDrink(drink.id);
    }

    async getDrink(id: string): Promise<DrinkWithPrice> {
        const drink = await this.drinks.findById(id);
        if (!drink) {
            throw new NotFoundError("Drink", id);
        }
        return this.toView(drink, await this.loadLookups());
    }

    /** Every drink, available or not (for the administrator). */
    async listDrinks(): Promise<DrinkWithPrice[]> {
        const [drinks, lookups] = await Promise.all([this.drinks.findAll(), this.loadLookups()]);
        return drinks.map((drink) => this.toView(drink, lookups));
    }

    /** Drinks that can really be ordered (for the customer). */
    async listAvailableDrinks(): Promise<DrinkWithPrice[]> {
        const all = await this.listDrinks();
        return all.filter((drink) => drink.isAvailable);
    }

    /** A drink can only be activated while its type and flavor are active. */
    async activateDrink(id: string): Promise<DrinkWithPrice> {
        const drink = await this.drinks.findById(id);
        if (!drink) {
            throw new NotFoundError("Drink", id);
        }
        if (!drink.isActive) {
            await this.requireActive(this.drinkTypes, "DrinkType", drink.drinkTypeId);
            await this.requireActive(this.drinkFlavors, "DrinkFlavor", drink.drinkFlavorId);
            await this.drinks.save({ ...drink, isActive: true });
        }
        return this.getDrink(id);
    }

    async deactivateDrink(id: string): Promise<DrinkWithPrice> {
        await setActive(this.drinks, "Drink", id, false);
        return this.getDrink(id);
    }

    /** Deleting a drink also deletes its list of extras, which has no meaning without it. */
    async deleteDrink(id: string): Promise<void> {
        if (!(await this.drinks.findById(id))) {
            throw new NotFoundError("Drink", id);
        }
        // The drinks extras are part of it, so they go away with it in the same operation
        await this.drinks.delete(id);
    }

    /** -------------------------------------------- HELPERS -------------------------------------------- */

    /** The single place that defines the price of a drink. */
    private calculateDrinkPrice(type: DrinkType, flavor: DrinkFlavor): number {
        return type.priceCents + flavor.priceCents;
    }

    /**
     * The single place that defines when a drink is available: it, its type and its flavor
     * are active, it has an active size, an active milk when it offers milk,
     * and every extra it includes is active.
     */
    private isAvailable(drink: Drink, type: DrinkType, flavor: DrinkFlavor, lookups: MenuLookups): boolean {
        if (!drink.isActive || !type.isActive || !flavor.isActive) {
            return false;
        }
        const hasActive = (ids: string[], catalog: Map<string, { isActive: boolean }>) =>
            ids.some((id) => catalog.get(id)?.isActive === true);

        if (!hasActive(drink.allowedSizeIds, lookups.sizes)) {
            return false;
        }
        if (drink.allowedMilkTypeIds.length > 0 && !hasActive(drink.allowedMilkTypeIds, lookups.milkTypes)) {
            return false;
        }
        return drink.extras.every((e) => e.includedQuantity === 0 || lookups.extras.get(e.extraId)?.isActive === true);
    }

    private toView(drink: Drink, lookups: MenuLookups): DrinkWithPrice {
        // Deleting is blocked while something uses a record, so a missing one means corrupted data.
        const type = lookups.types.get(drink.drinkTypeId);
        if (!type) {
            throw new NotFoundError("DrinkType", drink.drinkTypeId);
        }
        const flavor = lookups.flavors.get(drink.drinkFlavorId);
        if (!flavor) {
            throw new NotFoundError("DrinkFlavor", drink.drinkFlavorId);
        }
        const includedExtras: IncludedExtra[] = drink.extras
            .filter((e) => e.includedQuantity > 0)
            .map((e) => {
                const extra = lookups.extras.get(e.extraId);
                if (!extra) {
                    throw new NotFoundError("Extra", e.extraId);
                }
                return { extraId: extra.id, name: extra.name, quantity: e.includedQuantity };
            });

        return {
            ...drink,
            priceCents: this.calculateDrinkPrice(type, flavor),
            isAvailable: this.isAvailable(drink, type, flavor, lookups),
            drinkTypeName: type.name,
            drinkFlavorName: flavor.name,
            includedExtras,
        };
    }

    // The menu is small (tens of records per catalog), so reading each catalog whole is simple
    // and cheap. If it ever grows, the repositories can offer "find by ids" without changing this class's rules.
    private async loadLookups(): Promise<MenuLookups> {
        const [types, flavors, sizes, milkTypes, extras] = await Promise.all([
            this.drinkTypes.findAll(),
            this.drinkFlavors.findAll(),
            this.sizes.findAll(),
            this.milkTypes.findAll(),
            this.extras.findAll(),
        ]);

        return {
            types: new Map(types.map((t) => [t.id, t] as const)),
            flavors: new Map(flavors.map((f) => [f.id, f] as const)),
            sizes: new Map(sizes.map((s) => [s.id, s] as const)),
            milkTypes: new Map(milkTypes.map((m) => [m.id, m] as const)),
            extras: new Map(extras.map((e) => [e.id, e] as const)),
        };
    }

    /** Finds a record that must exist AND be active. */
    private async requireActive<T extends { id: string; isActive: boolean }>(
        repository: { findById(id: string): Promise<T | null> },
        entityName: string,
        id: string,
    ): Promise<T> {
        const entity = await repository.findById(id);
        if (!entity) {
            throw new NotFoundError(entityName, id);
        }
        if (!entity.isActive) {
            throw new InactiveOptionError(entityName, id);
        }
        return entity;
    }

    /** Blank means "no image". Only https addresses are accepted. */
    private cleanImageUrl(imageUrl: string | undefined): string | undefined {
        const clean = imageUrl?.trim() || undefined;
        if (clean === undefined) {
            return undefined;
        }
        if (clean.length > IMAGE_URL_MAX_LENGTH) {
            throw new InvalidInputError("imageUrl", `must be at most ${IMAGE_URL_MAX_LENGTH} characters`);
        }
        let parsed: URL;
        try {
            parsed = new URL(clean);
        } catch {
            throw new InvalidInputError("imageUrl", "must be a valid URL");
        }
        if (parsed.protocol !== "https:") {
            throw new InvalidInputError("imageUrl", "must use https");
        }
        return clean;
    }
}
