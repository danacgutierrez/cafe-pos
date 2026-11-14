import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { InactiveOptionError } from "../menu/domain/errors";
import { NotFoundError } from "../shared/not-found-error";
import { expectRejected } from "./helpers";
import { Scenario } from "./scenario";
import { basicDrinkInput, buildMenu, fullDrinkInput, seedCatalog } from "./setup";

export const availabilityScenarios: Scenario[] = [
    {
        title: "A drink can be turned off and on again",
        kind: "works",
        async run() {
            const { menu, options } = buildMenu();
            const catalog = await seedCatalog(options);
            const drink = await menu.createDrink(fullDrinkInput(catalog));

            const off = await menu.deactivateDrink(drink.id);
            assert.equal(off.isActive, false);
            assert.equal(off.isAvailable, false);
            assert.equal((await menu.listAvailableDrinks()).length, 0);
            assert.equal((await menu.listDrinks()).length, 1, "the administrator still sees it");

            const on = await menu.activateDrink(drink.id);
            assert.equal(on.isActive, true);
            assert.equal((await menu.listAvailableDrinks()).length, 1);

            // Doing it twice changes nothing.
            assert.equal((await menu.activateDrink(drink.id)).isActive, true);
            console.log("  OK: off -> hidden from customers, on -> visible again");
        },
    },
    {
        title: "A drink cannot be activated while its type or flavor is inactive",
        kind: "rejected",
        async run() {
            const { menu, options } = buildMenu();
            const catalog = await seedCatalog(options);
            const drink = await menu.createDrink(basicDrinkInput(catalog));
            await menu.deactivateDrink(drink.id);

            await options.deactivateDrinkType(catalog.matcha.id);
            const typeError = await expectRejected(() => menu.activateDrink(drink.id), InactiveOptionError);
            console.log("  OK: inactive type ->", typeError.message);
            await options.activateDrinkType(catalog.matcha.id);

            await options.deactivateDrinkFlavor(catalog.bananaPudding.id);
            await expectRejected(() => menu.activateDrink(drink.id), InactiveOptionError);
            console.log("  OK: inactive flavor rejected too");
            assert.equal((await menu.getDrink(drink.id)).isActive, false, "the drink must stay off");
        },
    },
    {
        title: "Turning off a type or flavor hides its drinks without touching them",
        kind: "works",
        async run() {
            const { menu, options } = buildMenu();
            const catalog = await seedCatalog(options);
            const drink = await menu.createDrink(basicDrinkInput(catalog));

            await options.deactivateDrinkType(catalog.matcha.id);
            const hidden = await menu.getDrink(drink.id);
            assert.equal(hidden.isActive, true, "the drink's own state does not change");
            assert.equal(hidden.isAvailable, false);
            assert.equal((await menu.listAvailableDrinks()).length, 0);

            await options.activateDrinkType(catalog.matcha.id);
            assert.equal((await menu.getDrink(drink.id)).isAvailable, true);

            await options.deactivateDrinkFlavor(catalog.bananaPudding.id);
            assert.equal((await menu.getDrink(drink.id)).isAvailable, false);
            console.log("  OK: availability is worked out when the menu is read");
        },
    },
    {
        title: "A drink needs an active size, and an active milk when it offers milk",
        kind: "works",
        async run() {
            const { menu, options } = buildMenu();
            const catalog = await seedCatalog(options);
            const withMilk = await menu.createDrink(fullDrinkInput(catalog));
            const noMilkFlavor = await options.createDrinkFlavor("Plain", 200);
            const withoutMilk = await menu.createDrink(
                basicDrinkInput(catalog, { name: "Plain matcha", drinkFlavorId: noMilkFlavor.id }),
            );

            // One active size is enough.
            await options.deactivateSize(catalog.large.id);
            assert.equal((await menu.getDrink(withMilk.id)).isAvailable, true);
            // No active size left.
            await options.deactivateSize(catalog.small.id);
            assert.equal((await menu.getDrink(withMilk.id)).isAvailable, false);
            assert.equal((await menu.getDrink(withoutMilk.id)).isAvailable, false);
            await options.activateSize(catalog.small.id);
            assert.equal((await menu.getDrink(withMilk.id)).isAvailable, true);
            console.log("  OK: sizes decide availability");

            // Milk only matters for the drink that offers it.
            await options.deactivateMilkType(catalog.wholeMilk.id);
            assert.equal((await menu.getDrink(withMilk.id)).isAvailable, true, "oat milk is still active");
            await options.deactivateMilkType(catalog.oatMilk.id);
            assert.equal((await menu.getDrink(withMilk.id)).isAvailable, false);
            assert.equal((await menu.getDrink(withoutMilk.id)).isAvailable, true, "this drink takes no milk");
            console.log("  OK: milk decides availability only where it is offered");
        },
    },
    {
        title: "An included extra must be active; an optional one does not matter",
        kind: "works",
        async run() {
            const { menu, options } = buildMenu();
            const catalog = await seedCatalog(options);
            const drink = await menu.createDrink(fullDrinkInput(catalog));

            // Espresso shot is only allowed (0 included): turning it off changes nothing.
            await options.deactivateExtra(catalog.espressoShot.id);
            assert.equal((await menu.getDrink(drink.id)).isAvailable, true);

            // Cold foam comes included: without it the drink cannot be prepared as sold.
            await options.deactivateExtra(catalog.coldFoam.id);
            assert.equal((await menu.getDrink(drink.id)).isAvailable, false);
            await options.activateExtra(catalog.coldFoam.id);
            assert.equal((await menu.getDrink(drink.id)).isAvailable, true);
            console.log("  OK: only included extras affect availability (provisional rule)");
        },
    },
    {
        title: "Unknown ids are not found",
        kind: "rejected",
        async run() {
            const { menu, options } = buildMenu();

            await expectRejected(() => menu.getDrink(randomUUID()), NotFoundError);
            await expectRejected(() => menu.activateDrink(randomUUID()), NotFoundError);
            await expectRejected(() => menu.deactivateDrink(randomUUID()), NotFoundError);
            await expectRejected(() => options.activateDrinkType(randomUUID()), NotFoundError);
            await expectRejected(() => options.deactivateSize(randomUUID()), NotFoundError);
            await expectRejected(() => options.deactivateExtra(randomUUID()), NotFoundError);
            console.log("  OK: NotFoundError for drinks and options");
        },
    },
];
