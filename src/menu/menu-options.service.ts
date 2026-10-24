import { randomUUID } from "crypto"
import { DrinkType } from "./domain/entities/drink-type.entity"
import { DrinkFlavor } from "./domain/entities/drink-flavor.entity"
import { Size } from "./domain/entities/size.entity"
import { MilkType } from "./domain/entities/milk-type.entity"
import { Sweetener } from "./domain/entities/sweetener.entity"
import { Extra } from "./domain/entities/extra.entity"
import { DrinkRepository } from "./domain/repositories/drink.repository"
import { DrinkTypeRepository } from "./domain/repositories/drink-type.repository"
import { DrinkFlavorRepository } from "./domain/repositories/drink-flavor.repository"
import { SizeRepository } from "./domain/repositories/size.repository"
import { MilkTypeRepository } from "./domain/repositories/milk-type.repository"
import { SweetenerRepository } from "./domain/repositories/sweetener.repository"
import { ExtraRepository } from "./domain/repositories/extra.repository"
import { DuplicateNameError } from "../shared/duplicate-name-error"
import { NotFoundError } from "../shared/not-found-error"
import { DuplicateSweetenerLevelError, InUseError } from "./domain/errors"
import { MAX_EXTRA_QUANTITY, MAX_SWEETENER_LEVEL } from "./domain/limits"
import { DrinkExtraRepository } from "./domain/repositories/drink-extra.repository"
import { assertIntegerInRange, assertValidPrice, normalizeName } from "./domain/validation"
import { setActive } from "./domain/activation"

/** What a repository needs to offer so a name can be checked and a record deleted. */
interface NamedRepository {
    findByName(name: string): Promise<unknown | null>;
    findById(id: string): Promise<unknown | null>;
    delete(id: string): Promise<void>;
}

/**
 * The catalogs a drink is built from: types, flavors, sizes, milk types,
 * sweeteners and extras. Each one is created, turned on/off and deleted here;
 * drinks themselves are handled by MenuService.
 */
export class MenuOptionsService {
    constructor(
        private readonly drinks: DrinkRepository,
        private readonly drinkTypes: DrinkTypeRepository,
        private readonly drinkFlavors: DrinkFlavorRepository,
        private readonly sizes: SizeRepository,
        private readonly milkTypes: MilkTypeRepository,
        private readonly sweeteners: SweetenerRepository,
        private readonly extras: ExtraRepository,
        private readonly drinkExtras: DrinkExtraRepository,
    ) { }

    /** -------------------------------------------- CREATE -------------------------------------------- */

    async createDrinkType(name: string, priceCents: number): Promise<DrinkType> {
        const normalizedName = normalizeName(name);
        assertValidPrice(priceCents);
        await this.assertNameFree(this.drinkTypes, "DrinkType", normalizedName);

        return this.drinkTypes.save({ id: randomUUID(), name: normalizedName, isActive: true, priceCents });
    }

    async createDrinkFlavor(name: string, priceCents: number): Promise<DrinkFlavor> {
        const normalizedName = normalizeName(name);
        assertValidPrice(priceCents);
        await this.assertNameFree(this.drinkFlavors, "DrinkFlavor", normalizedName);

        return this.drinkFlavors.save({ id: randomUUID(), name: normalizedName, isActive: true, priceCents });
    }

    async createSize(name: string, priceCents: number): Promise<Size> {
        const normalizedName = normalizeName(name);
        assertValidPrice(priceCents);
        await this.assertNameFree(this.sizes, "Size", normalizedName);

        return this.sizes.save({ id: randomUUID(), name: normalizedName, isActive: true, priceCents });
    }

    async createMilkType(name: string, priceCents: number): Promise<MilkType> {
        const normalizedName = normalizeName(name);
        assertValidPrice(priceCents);
        await this.assertNameFree(this.milkTypes, "MilkType", normalizedName);

        return this.milkTypes.save({ id: randomUUID(), name: normalizedName, isActive: true, priceCents });
    }

    async createSweetener(name: string, level: number, priceCents: number): Promise<Sweetener> {
        const normalizedName = normalizeName(name);
        assertIntegerInRange("level", level, 0, MAX_SWEETENER_LEVEL);
        assertValidPrice(priceCents);
        await this.assertNameFree(this.sweeteners, "Sweetener", normalizedName);

        if (await this.sweeteners.findByLevel(level)) {
            throw new DuplicateSweetenerLevelError(level);
        }

        return this.sweeteners.save({ id: randomUUID(), name: normalizedName, level, isActive: true, priceCents });
    }

    async createExtra(name: string, priceCents: number, maxQuantity: number): Promise<Extra> {
        const normalizedName = normalizeName(name);
        assertValidPrice(priceCents);
        assertIntegerInRange("maxQuantity", maxQuantity, 1, MAX_EXTRA_QUANTITY);
        await this.assertNameFree(this.extras, "Extra", normalizedName);

        return this.extras.save({ id: randomUUID(), name: normalizedName, isActive: true, priceCents, maxQuantity });
    }

    /** -------------------------------------------- ACTIVATE / DEACTIVATE -------------------------------------------- */
    // Turning an option off never touches the drinks that use it: whether a drink
    // can be ordered is worked out when the menu is read (see MenuService.isAvailable).

    activateDrinkType(id: string): Promise<DrinkType> {
        return setActive(this.drinkTypes, "DrinkType", id, true);
    }

    deactivateDrinkType(id: string): Promise<DrinkType> {
        return setActive(this.drinkTypes, "DrinkType", id, false);
    }

    activateDrinkFlavor(id: string): Promise<DrinkFlavor> {
        return setActive(this.drinkFlavors, "DrinkFlavor", id, true);
    }

    deactivateDrinkFlavor(id: string): Promise<DrinkFlavor> {
        return setActive(this.drinkFlavors, "DrinkFlavor", id, false);
    }

    activateSize(id: string): Promise<Size> {
        return setActive(this.sizes, "Size", id, true);
    }

    deactivateSize(id: string): Promise<Size> {
        return setActive(this.sizes, "Size", id, false);
    }

    activateMilkType(id: string): Promise<MilkType> {
        return setActive(this.milkTypes, "MilkType", id, true);
    }

    deactivateMilkType(id: string): Promise<MilkType> {
        return setActive(this.milkTypes, "MilkType", id, false);
    }

    activateSweetener(id: string): Promise<Sweetener> {
        return setActive(this.sweeteners, "Sweetener", id, true);
    }

    deactivateSweetener(id: string): Promise<Sweetener> {
        return setActive(this.sweeteners, "Sweetener", id, false);
    }

    activateExtra(id: string): Promise<Extra> {
        return setActive(this.extras, "Extra", id, true);
    }

    deactivateExtra(id: string): Promise<Extra> {
        return setActive(this.extras, "Extra", id, false);
    }

    /** -------------------------------------------- DELETE -------------------------------------------- */
    // Blocked while a drink still uses the record. The "it already appeared in an order"
    // check will be added with the Orders module, through a small interface owned by the menu.

    deleteDrinkType(id: string): Promise<void> {
        return this.deleteIfUnused(this.drinkTypes, "DrinkType", id, () => this.drinks.existsByDrinkTypeId(id));
    }

    deleteDrinkFlavor(id: string): Promise<void> {
        return this.deleteIfUnused(this.drinkFlavors, "DrinkFlavor", id, () => this.drinks.existsByDrinkFlavorId(id));
    }

    deleteSize(id: string): Promise<void> {
        return this.deleteIfUnused(this.sizes, "Size", id, () => this.drinks.existsByAllowedSizeId(id));
    }

    deleteMilkType(id: string): Promise<void> {
        return this.deleteIfUnused(this.milkTypes, "MilkType", id, () => this.drinks.existsByAllowedMilkTypeId(id));
    }

    deleteSweetener(id: string): Promise<void> {
        return this.deleteIfUnused(this.sweeteners, "Sweetener", id, () => this.drinks.existsByAllowedSweetenerId(id));
    }

    deleteExtra(id: string): Promise<void> {
        return this.deleteIfUnused(this.extras, "Extra", id, () => this.drinkExtras.existsByExtraId(id));
    }

    /** -------------------------------------------- HELPERS -------------------------------------------- */
    private async assertNameFree(repository: Pick<NamedRepository, "findByName">, entityName: string, name: string): Promise<void> {
        if (await repository.findByName(name)) {
            throw new DuplicateNameError(entityName, name);
        }
    }

    private async deleteIfUnused(
        repository: Pick<NamedRepository, "findById" | "delete">,
        entityName: string,
        id: string,
        isInUse: () => Promise<boolean>,
    ): Promise<void> {
        if (!(await repository.findById(id))) {
            throw new NotFoundError(entityName, id);
        }
        if (await isInUse()) {
            throw new InUseError(entityName, id);
        }
        await repository.delete(id);
    }
}
