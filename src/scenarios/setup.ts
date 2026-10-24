/**
 * This is the ONLY file in the scenarios that knows the in-memory implementations.
 * Swapping the persistence layer happens here.
 */
import { MenuService } from "../menu/menu.service";
import { MenuOptionsService } from "../menu/menu-options.service";
import { CreateDrinkInput } from "../menu/domain/models/create-drink-input";
import { InMemoryDrinkRepository } from "../menu/infra/in-memory-drink.repository";
import { InMemoryDrinkTypeRepository } from "../menu/infra/in-memory-drink-type.repository";
import { InMemoryDrinkFlavorRepository } from "../menu/infra/in-memory-drink-flavor.repository";
import { InMemorySizeRepository } from "../menu/infra/in-memory-size.repository";
import { InMemoryMilkTypeRepository } from "../menu/infra/in-memory-milk-type.repository";
import { InMemorySweetenerRepository } from "../menu/infra/in-memory-sweetener.repository";
import { InMemoryExtraRepository } from "../menu/infra/in-memory-extra.repository";
import { InMemoryDrinkExtraRepository } from "../menu/infra/in-memory-drink-extra.repository";

/** Builds an empty menu. Each scenario starts from scratch. */
export function buildMenu() {
    const drinks = new InMemoryDrinkRepository();
    const drinkTypes = new InMemoryDrinkTypeRepository();
    const drinkFlavors = new InMemoryDrinkFlavorRepository();
    const sizes = new InMemorySizeRepository();
    const milkTypes = new InMemoryMilkTypeRepository();
    const sweeteners = new InMemorySweetenerRepository();
    const extras = new InMemoryExtraRepository();
    const drinkExtras = new InMemoryDrinkExtraRepository();

    const menu = new MenuService(drinks, drinkTypes, drinkFlavors, sizes, milkTypes, sweeteners, extras, drinkExtras);
    const options = new MenuOptionsService(drinks, drinkTypes, drinkFlavors, sizes, milkTypes, sweeteners, extras, drinkExtras);

    return { menu, options, drinks, drinkTypes, drinkFlavors, sizes, milkTypes, sweeteners, extras, drinkExtras };
}

export type Kit = ReturnType<typeof buildMenu>;

/** A small catalog with one or two of everything, the basis of most scenarios. */
export async function seedCatalog(options: MenuOptionsService) {
    return {
        matcha: await options.createDrinkType("Matcha", 4500),
        bananaPudding: await options.createDrinkFlavor("Banana pudding", 500),
        small: await options.createSize("Small", 0),
        large: await options.createSize("Large", 1000),
        wholeMilk: await options.createMilkType("Whole milk", 0),
        oatMilk: await options.createMilkType("Oat milk", 1500),
        light: await options.createSweetener("Light", 1, 0),
        extraSweet: await options.createSweetener("Extra sweet", 3, 300),
        coldFoam: await options.createExtra("Cold foam", 1200, 2),
        espressoShot: await options.createExtra("Espresso shot", 1500, 3),
    };
}

export type Catalog = Awaited<ReturnType<typeof seedCatalog>>;

/** The minimum a drink needs: a type, a flavor and one size. */
export function basicDrinkInput(catalog: Catalog, overrides: Partial<CreateDrinkInput> = {}): CreateDrinkInput {
    return {
        name: "Banana pudding matcha",
        description: "Matcha with banana pudding flavor",
        drinkTypeId: catalog.matcha.id,
        drinkFlavorId: catalog.bananaPudding.id,
        sizeIds: [catalog.small.id],
        ...overrides,
    };
}

/** The drink the manager sells: two sizes, two milks, two sweeteners, and cold foam included. */
export function fullDrinkInput(catalog: Catalog, overrides: Partial<CreateDrinkInput> = {}): CreateDrinkInput {
    return basicDrinkInput(catalog, {
        sizeIds: [catalog.small.id, catalog.large.id],
        milkTypeIds: [catalog.wholeMilk.id, catalog.oatMilk.id],
        sweetenerIds: [catalog.light.id, catalog.extraSweet.id],
        extras: [
            { extraId: catalog.coldFoam.id, includedQuantity: 1 },
            { extraId: catalog.espressoShot.id, includedQuantity: 0 },
        ],
        imageUrl: "https://example.com/banana-pudding-matcha.png",
        ...overrides,
    });
}
