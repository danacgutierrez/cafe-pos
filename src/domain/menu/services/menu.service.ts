import { randomUUID } from "node:crypto";
import { DrinkType } from "../entities/drink-type.entity.js";
import { DrinkRepository } from "../ports/drink.repository.js";
import { DrinkTypeRepository } from "../ports/drink-type.repository.js";
import { FlavorRepository } from "../ports/flavor.repository.js";
import { MilkTypeRepository } from "../ports/milk-type.repository.js";
import { SizeRepository } from "../ports/size.repository.js";
import { StockChecker } from "../ports/stock-checker.js";
import { SweetenerRepository } from "../ports/sweetener.repository.js";
import { UsageChecker } from "../ports/usage-checker.js";
import { Flavor } from "../entities/flavor.entity.js";
import { Size } from "../entities/size.entity.js";
import { MilkType } from "../entities/milk-type.entity.js";
import { Sweetener } from "../entities/sweetener.entity.js";
import { DrinkDetail } from "../entities/drink-detail.entity.js";
import { Drink } from "../entities/drink.entity.js";
import { DuplicateDrinkError } from "../errors/duplicate-drink-error.js";
import { NotFoundError } from "../../shared/not-found-error.js";
import { EmptyRecipeError } from "../errors/empty-recipe-error.js";
import { InUseError } from "../errors/in-use-error.js";
import { InactiveOptionError } from "../errors/inactive-option-error.js";
import { MilkNotAllowedError } from "../errors/milk-not-allowed-error.js";
import { Repository } from "../../shared/repository.js";
import { ExtraRepository } from "../ports/extra.repository.js";
import { Extra } from "../entities/extra.entity.js";

// Owns all Menu catalog rules (drink types, flavors, sizes, milk types, sweeteners, drinks)
// and the drink-specific rules. Depends only on ports — StockChecker and
// UsageChecker specifically — never on concrete Inventory or (future) Orders classes.
export class MenuService {
    constructor(
        private readonly drinks: DrinkRepository,
        private readonly drinkTypes: DrinkTypeRepository,
        private readonly flavors: FlavorRepository,
        private readonly sizes: SizeRepository,
        private readonly milkTypes: MilkTypeRepository,
        private readonly sweeteners: SweetenerRepository,
        private readonly extras: ExtraRepository,
        private readonly stockChecker: StockChecker,
        private readonly usageChecker: UsageChecker,
    ) { }

    async createDrinkType(name: string): Promise<DrinkType> {
        return this.drinkTypes.save({ id: randomUUID(), name, isActive: true });
    }

    async activateDrinkType(id: string) {
        return this.toggleActive(this.drinkTypes, id, "DrinkType", true);
    }
    async deactivateDrinkType(id: string) {
        return this.toggleActive(this.drinkTypes, id, "DrinkType", false);
    }
    async deleteDrinkType(id: string) {
        return this.deleteIfUnused(this.drinkTypes, "drinkType", id);
    }

    async createFlavor(name: string): Promise<Flavor> {
        return this.flavors.save({ id: randomUUID(), name, isActive: true });
    }

    async activateFlavor(id: string) {
        return this.toggleActive(this.flavors, id, "Flavor", true);
    }
    async deactivateFlavor(id: string) {
        return this.toggleActive(this.flavors, id, "Flavor", false);
    }
    async deleteFlavor(id: string) {
        return this.deleteIfUnused(this.flavors, "flavor", id);
    }

    async createSize(name: string, factor: number, extraPrice: number): Promise<Size> {
        return this.sizes.save({ id: randomUUID(), name, factor, extraPrice, isActive: true });
    }

    async activateSize(id: string) {
        return this.toggleActive(this.sizes, id, "Size", true);
    }
    async deactivateSize(id: string) {
        return this.toggleActive(this.sizes, id, "Size", false);
    }
    async deleteSize(id: string) {
        return this.deleteIfUnused(this.sizes, "size", id);
    }

    async createMilkType(name: string, extraPrice: number, ingredientId: string): Promise<MilkType> {
        return this.milkTypes.save({ id: randomUUID(), name, extraPrice, ingredientId, isActive: true });
    }

    async activateMilkType(id: string) {
        return this.toggleActive(this.milkTypes, id, "MilkType", true);
    }
    async deactivateMilkType(id: string) {
        return this.toggleActive(this.milkTypes, id, "MilkType", false);
    }
    async deleteMilkType(id: string) {
        return this.deleteIfUnused(this.milkTypes, "milkType", id);
    }

    async createSweetener(name: string, extraPrice: number, quantity: number, ingredientId: string): Promise<Sweetener> {
        return this.sweeteners.save({ id: randomUUID(), name, extraPrice, quantity, ingredientId, isActive: true });
    }

    async activateSweetener(id: string) {
        return this.toggleActive(this.sweeteners, id, "Sweetener", true);
    }
    async deactivateSweetener(id: string) {
        return this.toggleActive(this.sweeteners, id, "Sweetener", false);
    }
    async deleteSweetener(id: string) {
        return this.deleteIfUnused(this.sweeteners, "sweetener", id);
    }

    async createExtra(name: string, extraPrice: number): Promise<Extra> {
        return this.extras.save({id: randomUUID(), name, extraPrice, isActive: true});
    }

    async activateExtra(id: string) {
        return this.toggleActive(this.extras, id, "Extra", true);
    }

    async deactivateExtra(id: string) {
        return this.toggleActive(this.extras, id, "Extra", false);
    }

    async deleteExtra(id: string) {
        return this.deleteIfUnused(this.extras, "extra", id);
    }

    async createDrink(
        name: string,
        price: number,
        description: string,
        drinkTypeId: string,
        flavorId: string,
        milkQuantity: number | null,
        recipe: DrinkDetail[],
    ): Promise<Drink> {
        const existing = await this.drinks.findByTypeAndFlavor(drinkTypeId, flavorId);
        if (existing) {
            throw new DuplicateDrinkError(drinkTypeId, flavorId);
        }

        return this.drinks.save({
            id: randomUUID(),
            kind: "drink",
            name,
            price,
            description,
            isActive: false, // Drinks always start inactive; activateDrink() is the only path to isActive: true
            drinkTypeId,
            flavorId,
            milkQuantity,
            recipe
        });
    }

    // can't go active without at least one recipe line.
    async activateDrink(drinkId: string): Promise<void> {
        const drink = await this.drinks.findById(drinkId);
        if (!drink) {
            throw new NotFoundError("Drink", drinkId);
        }

        if (drink.recipe.length === 0) {
            throw new EmptyRecipeError(drinkId);
        }

        drink.isActive = true;
        await this.drinks.save(drink);
    }

    // Always allowed, no rule blocks this — it's the safe alternative to delete 
    async deactivateDrink(drinkId: string): Promise<void> {
        const drink = await this.drinks.findById(drinkId);
        if (!drink) {
            throw new NotFoundError("Drink", drinkId);
        }

        drink.isActive = false;
        await this.drinks.save(drink);
    }

    // hard delete only allowed if nothing has ever ordered this drink.
    async deleteDrink(drinkId: string): Promise<void> {
        const inUse = await this.usageChecker.isReferencedInOrders("drink", drinkId);
        if (inUse) {
            throw new InUseError("drink", drinkId);
        }

        await this.drinks.delete(drinkId);
    }
    // the entry point the (future) Orders module should call before adding a drink to a
    // cart — confirms it exists and is active.
    async getOrderableDrink(drinkId: string): Promise<Drink> {
        const drink = await this.drinks.findById(drinkId);
        if (!drink) {
            throw new NotFoundError("Drink", drinkId);
        }
        if (!drink.isActive) {
            throw new InactiveOptionError("drink", drinkId);
        }

        return drink;
    }

    // (inactive size/milk/sweetener rejected) + (milk only allowed if this specific
    // drink supports it; sweetener/size checked independently). Returns the resolved entities so
    // the caller (Orders) doesn't have to re-fetch them.
    async validateOrderOption(
        drink: Drink,
        sizeId: string,
        milkTypeId: string | null,
        sweetenerId: string | null,
    ): Promise<{ size: Size; milkType: MilkType | null; sweetener: Sweetener | null }> {

        const size = await this.sizes.findById(sizeId);
        if (!size || !size.isActive) {
            throw new InactiveOptionError("size", sizeId);
        }

        let milkType: MilkType | null = null;
        if (milkTypeId) {
            if (drink.milkQuantity === null) {
                throw new MilkNotAllowedError(drink.id);
            }

            milkType = await this.milkTypes.findById(milkTypeId);
            if (!milkType || !milkType.isActive) {
                throw new InactiveOptionError("milkType", milkTypeId)
            }
        }

        let sweetener: Sweetener | null = null;
        if (sweetenerId) {
            sweetener = await this.sweeteners.findById(sweetenerId);
            if (!sweetener || !sweetener.isActive) {
                throw new InactiveOptionError("sweetener", sweetenerId);
            }
        }

        return { size, milkType, sweetener };
    }

    async validateExtras(extraIds: string[]): Promise<Extra[]> {
        const validated: Extra[] = [];
        for (const extraId of extraIds) {
            const extra = await this.extras.findById(extraId);
            if(!extra || !extra.isActive){
                throw new InactiveOptionError("extra", extraId);
            }
            validated.push(extra)
        }
        return validated
    }

    // the only place the final price is computed. Returns a plain number — it's the
    // caller's (Orders) job to freeze this value onto the order line so later price changes
    // don't affect past orders.
    calculatePrice(
        drink: Drink,
        size: Size,
        milkType: MilkType | null,
        sweetener: Sweetener | null,
        extras: Extra[] = [],
    ): number {
        let total = drink.price;
        total += size.extraPrice;
        if (milkType) total += milkType.extraPrice;
        if (sweetener) total += sweetener.extraPrice;
        for (const extra of extras) total += extra.extraPrice;
        return total;
    }

    // Checks stock one drink at a time via StockChecker. Fine for the in-memory/small-catalog
    // case; revisit if this needs to scale to many drinks with a real database.
    async listAvailableDrinks(): Promise<Drink[]> {
        const activeDrinks = await this.drinks.findActive();
        const available: Drink[] = [];
        for (const drink of activeDrinks) {
            if (await this.stockChecker.hasEnoughStock(drink.id)) {
                available.push(drink);
            }
        }
        return available;
    }

    // Generic activate/deactivate shared by DrinkType, Flavor, Size, MilkType and Sweetener -
    // same idea as Repository<T>: one implementation, specialized per entity via the type param.
    // Drink doesn't use this for activation because it has the extra RN-03 recipe check.
    private async toggleActive<T extends { id: string; isActive: boolean }>(
        repository: Repository<T>,
        id: string,
        entityName: string,
        isActive: boolean,
    ): Promise<void> {
        const entity = await repository.findById(id);
        if (!entity) throw new NotFoundError(entityName, id);
        entity.isActive = isActive;
        await repository.save(entity);
    }

    // Shared delete-guard for all five simple catalogs. The `as any` narrows entityType
    // to UsageChecker's specific string union - safe here since every caller passes one of those
    // literal values, but worth tightening if this port's signature changes.
    private async deleteIfUnused(
        repository: Repository<{ id: string }>,
        entityType: string,
        id: string,
    ): Promise<void> {
        const inUse = await this.usageChecker.isReferencedInOrders(entityType as any, id);
        if (inUse) throw new InUseError(entityType, id);
        await repository.delete(id);
    }

    // Backs the "reactivate" admin screens: lets the owner see what's currently turned off
    // per catalog, so she can bring back a seasonal flavor, for example.
    private async listInactive<T extends { isActive: boolean }>(
        repository: Repository<T>,
    ): Promise<T[]> {
        const all = await repository.findAll();
        return all.filter((entity) => !entity.isActive);
    }

    // One per catalog, all delegating to the generic helper above.
    async listInactiveFlavors() { return this.listInactive(this.flavors); }
    async listInactiveSizes() { return this.listInactive(this.sizes); }
    async listInactiveMilkTypes() { return this.listInactive(this.milkTypes); }
    async listInactiveSweeteners() { return this.listInactive(this.sweeteners); }
    async listInactiveDrinkTypes() { return this.listInactive(this.drinkTypes); }
    async listInactiveDrinks() { return this.listInactive(this.drinks); }
    async listInactiveExtras() { return this.listInactive(this.extras); }
}