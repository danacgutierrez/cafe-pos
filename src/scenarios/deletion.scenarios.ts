import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { InUseError } from "../menu/domain/errors";
import { NotFoundError } from "../shared/not-found-error";
import { expectRejected } from "./helpers";
import { Scenario } from "./scenario";
import { buildMenu, fullDrinkInput, seedCatalog } from "./setup";

export const deletionScenarios: Scenario[] = [
    {
        title: "Something nobody uses can be deleted",
        kind: "works",
        async run() {
            const { options, drinkTypes } = buildMenu();
            const type = await options.createDrinkType("Tea", 3000);

            await options.deleteDrinkType(type.id);
            assert.equal((await drinkTypes.findAll()).length, 0);
            console.log("  OK: unused type deleted");
        },
    },
    {
        title: "Anything a drink uses cannot be deleted; deleting the drink frees it",
        kind: "rejected",
        async run() {
            const { menu, options } = buildMenu();
            const catalog = await seedCatalog(options);
            const drink = await menu.createDrink(fullDrinkInput(catalog));

            const blocked: Array<[string, () => Promise<void>]> = [
                ["type", () => options.deleteDrinkType(catalog.matcha.id)],
                ["flavor", () => options.deleteDrinkFlavor(catalog.bananaPudding.id)],
                ["size", () => options.deleteSize(catalog.large.id)],
                ["milk", () => options.deleteMilkType(catalog.oatMilk.id)],
                ["sweetener", () => options.deleteSweetener(catalog.extraSweet.id)],
                ["extra", () => options.deleteExtra(catalog.coldFoam.id)],
            ];
            for (const [label, action] of blocked) {
                const error = await expectRejected(action, InUseError);
                console.log(`  OK: ${label} ->`, error.message);
            }

            await menu.deleteDrink(drink.id);
            await expectRejected(() => menu.getDrink(drink.id), NotFoundError);

            // Nothing uses them any more.
            await options.deleteDrinkType(catalog.matcha.id);
            await options.deleteDrinkFlavor(catalog.bananaPudding.id);
            await options.deleteSize(catalog.large.id);
            await options.deleteMilkType(catalog.oatMilk.id);
            await options.deleteSweetener(catalog.extraSweet.id);
            await options.deleteExtra(catalog.espressoShot.id); // its link went away with the drink
            console.log("  OK: after deleting the drink, all of them could be deleted");
        },
    },
    {
        title: "Deleting something that does not exist is not found",
        kind: "rejected",
        async run() {
            const { menu, options } = buildMenu();

            await expectRejected(() => menu.deleteDrink(randomUUID()), NotFoundError);
            await expectRejected(() => options.deleteDrinkType(randomUUID()), NotFoundError);
            await expectRejected(() => options.deleteExtra(randomUUID()), NotFoundError);
            console.log("  OK: NotFoundError");
        },
    },
];
