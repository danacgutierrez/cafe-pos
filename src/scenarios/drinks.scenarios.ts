import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
    DrinkWithoutSizesError,
    DuplicateDrinkError,
    ExtraQuantityExceededError,
    InactiveOptionError,
    PriceOutOfRangeError,
} from "../menu/domain/errors";
import { DESCRIPTION_MAX_LENGTH, IMAGE_URL_MAX_LENGTH, MAX_PRICE_CENTS, NAME_MAX_LENGTH } from "../menu/domain/limits";
import { DuplicateNameError } from "../shared/duplicate-name-error";
import { NotFoundError } from "../shared/not-found-error";
import { expectInvalidField, expectRejected } from "./helpers";
import { Scenario } from "./scenario";
import { basicDrinkInput, buildMenu, fullDrinkInput, seedCatalog } from "./setup";

export const drinkScenarios: Scenario[] = [
    {
        title: "Create a valid drink; its price is type + flavor",
        kind: "works",
        main: true,
        async run() {
            const { menu, options, drinks } = buildMenu();
            const catalog = await seedCatalog(options);

            const drink = await menu.createDrink(fullDrinkInput(catalog));

            assert.ok(drink.id.length > 0);
            assert.equal(drink.name, "Banana pudding matcha");
            assert.equal(drink.drinkTypeName, "Matcha");
            assert.equal(drink.drinkFlavorName, "Banana pudding");
            assert.equal(drink.priceCents, 5000, "price must be type (4500) + flavor (500)");
            assert.equal(drink.isActive, true);
            assert.equal(drink.isAvailable, true);
            assert.equal(drink.imageUrl, "https://example.com/banana-pudding-matcha.png");
            assert.deepEqual(drink.allowedSizeIds, [catalog.small.id, catalog.large.id]);
            assert.deepEqual(drink.includedExtras, [{ extraId: catalog.coldFoam.id, name: "Cold foam", quantity: 1 }]);
            assert.equal((await drinks.findAll()).length, 1);
            console.log(`  OK: "${drink.name}" created, price ${drink.priceCents} cents, includes cold foam`);
        },
    },
    {
        title: "The price is calculated, never stored",
        kind: "works",
        async run() {
            const { menu, options, drinkTypes } = buildMenu();
            const catalog = await seedCatalog(options);
            const drink = await menu.createDrink(basicDrinkInput(catalog));
            assert.equal(drink.priceCents, 5000);

            // Editing is not part of the service yet, so the type is changed through its repository.
            await drinkTypes.save({ ...catalog.matcha, priceCents: 5000 });

            assert.equal((await menu.getDrink(drink.id)).priceCents, 5500);
            console.log("  OK: the drink price followed its type (5000 -> 5500)");
        },
    },
    {
        title: "Names are normalized before saving",
        kind: "works",
        async run() {
            const { options } = buildMenu();

            const spaced = await options.createDrinkType("  Hot    coffee  ", 3000);
            assert.equal(spaced.name, "Hot coffee");

            // "e" + combining acute accent (4 characters once normalized to NFC)
            const decomposed = await options.createDrinkFlavor("Cafe\u0301", 500);
            assert.equal(decomposed.name, "Caf\u00e9");
            assert.equal(decomposed.name.length, 4);
            console.log("  OK: spaces collapsed and accents composed");
        },
    },
    {
        title: "A name cannot repeat inside its catalog (case and accent variants too)",
        kind: "rejected",
        async run() {
            const { menu, options, drinkTypes, drinks } = buildMenu();
            const catalog = await seedCatalog(options);
            await options.createDrinkType("Café", 3000);

            // Upper case + decomposed accent: must still count as the same name.
            const error = await expectRejected(() => options.createDrinkType("CAFE\u0301", 2500), DuplicateNameError);
            assert.equal((await drinkTypes.findAll()).length, 2, "the duplicate must not be saved");
            console.log("  OK: type rejected ->", error.message);

            await expectRejected(() => options.createSize("  LARGE ", 900), DuplicateNameError);
            await expectRejected(() => options.createMilkType("oat   milk", 900), DuplicateNameError);
            await expectRejected(() => options.createExtra("cold foam", 900, 1), DuplicateNameError);
            await expectRejected(() => options.createSweetener("LIGHT", 5, 0), DuplicateNameError);
            console.log("  OK: size, milk, extra and sweetener rejected too");

            // The same name in a DIFFERENT catalog is fine.
            await options.createDrinkFlavor("Large", 100);

            // Drinks too.
            const otherFlavor = await options.createDrinkFlavor("Caramel", 600);
            await menu.createDrink(basicDrinkInput(catalog, { name: "Signature latte" }));
            await expectRejected(
                () => menu.createDrink(basicDrinkInput(catalog, { name: "signature   LATTE", drinkFlavorId: otherFlavor.id })),
                DuplicateNameError,
            );
            assert.equal((await drinks.findAll()).length, 1);
            console.log("  OK: drink name rejected too");
        },
    },
    {
        title: "The same type + flavor combination cannot repeat",
        kind: "rejected",
        main: true,
        async run() {
            const { menu, options, drinks } = buildMenu();
            const catalog = await seedCatalog(options);
            await menu.createDrink(basicDrinkInput(catalog));

            // Different name, same combination.
            const error = await expectRejected(
                () => menu.createDrink(basicDrinkInput(catalog, { name: "Banana delight" })),
                DuplicateDrinkError,
            );
            assert.equal((await drinks.findAll()).length, 1);
            console.log("  OK: rejected ->", error.message);
        },
    },
    {
        title: "Inactive or unknown references cannot be used",
        kind: "rejected",
        async run() {
            const { menu, options, drinks } = buildMenu();
            const catalog = await seedCatalog(options);

            await options.deactivateDrinkFlavor(catalog.bananaPudding.id);
            await expectRejected(() => menu.createDrink(basicDrinkInput(catalog)), InactiveOptionError);
            await options.activateDrinkFlavor(catalog.bananaPudding.id);

            await options.deactivateDrinkType(catalog.matcha.id);
            await expectRejected(() => menu.createDrink(basicDrinkInput(catalog)), InactiveOptionError);
            await options.activateDrinkType(catalog.matcha.id);

            await options.deactivateSize(catalog.small.id);
            await expectRejected(() => menu.createDrink(basicDrinkInput(catalog)), InactiveOptionError);
            await options.activateSize(catalog.small.id);

            await options.deactivateExtra(catalog.coldFoam.id);
            await expectRejected(
                () => menu.createDrink(fullDrinkInput(catalog)),
                InactiveOptionError,
            );
            await options.activateExtra(catalog.coldFoam.id);
            console.log("  OK: inactive flavor, type, size and extra rejected");

            await expectRejected(() => menu.createDrink(basicDrinkInput(catalog, { drinkTypeId: randomUUID() })), NotFoundError);
            await expectRejected(() => menu.createDrink(basicDrinkInput(catalog, { drinkFlavorId: randomUUID() })), NotFoundError);
            await expectRejected(() => menu.createDrink(basicDrinkInput(catalog, { sizeIds: [randomUUID()] })), NotFoundError);
            await expectRejected(() => menu.createDrink(basicDrinkInput(catalog, { milkTypeIds: [randomUUID()] })), NotFoundError);
            await expectRejected(() => menu.createDrink(basicDrinkInput(catalog, { sweetenerIds: [randomUUID()] })), NotFoundError);
            await expectRejected(
                () => menu.createDrink(basicDrinkInput(catalog, { extras: [{ extraId: randomUUID(), includedQuantity: 0 }] })),
                NotFoundError,
            );
            console.log("  OK: unknown ids -> NotFoundError");

            assert.equal((await drinks.findAll()).length, 0, "nothing must be saved");
        },
    },
    {
        title: "Invalid names and prices",
        kind: "rejected",
        async run() {
            const { options, drinkTypes } = buildMenu();

            await expectInvalidField(() => options.createDrinkType("   ", 1000), "name");
            await expectInvalidField(() => options.createDrinkType("a".repeat(NAME_MAX_LENGTH + 1), 1000), "name");
            await expectInvalidField(() => options.createDrinkType("Tea", 10.5), "priceCents");
            await expectInvalidField(() => options.createDrinkType("Tea", -1), "priceCents");
            await expectInvalidField(() => options.createDrinkType("Tea", Number.NaN), "priceCents");
            await expectInvalidField(() => options.createDrinkFlavor("Mint", MAX_PRICE_CENTS + 1), "priceCents");
            await expectInvalidField(() => options.createSize("Giant", -5), "priceCents");
            await expectInvalidField(() => options.createMilkType("Almond", 0.5), "priceCents");
            assert.equal((await drinkTypes.findAll()).length, 0, "nothing must be saved");

            // Exact limits must be accepted.
            const longest = await options.createDrinkType("a".repeat(NAME_MAX_LENGTH), 0);
            assert.equal(longest.name.length, NAME_MAX_LENGTH);
            const priciest = await options.createDrinkFlavor("Gold", MAX_PRICE_CENTS);
            assert.equal(priciest.priceCents, MAX_PRICE_CENTS);
            console.log("  OK: invalid values rejected, exact limits accepted");
        },
    },
    {
        title: "Invalid description and image URL (only https is accepted)",
        kind: "rejected",
        async run() {
            const { menu, options, drinks } = buildMenu();
            const catalog = await seedCatalog(options);
            const create = (description: string, imageUrl?: string) =>
                menu.createDrink(basicDrinkInput(catalog, { description, ...(imageUrl !== undefined && { imageUrl }) }));

            await expectInvalidField(() => create("   "), "description");
            await expectInvalidField(() => create("d".repeat(DESCRIPTION_MAX_LENGTH + 1)), "description");
            await expectInvalidField(() => create("Classic", "not a url"), "imageUrl");
            await expectInvalidField(() => create("Classic", "http://example.com/a.png"), "imageUrl");
            await expectInvalidField(() => create("Classic", "ftp://example.com/a.png"), "imageUrl");
            await expectInvalidField(() => create("Classic", "javascript:alert(1)"), "imageUrl");
            await expectInvalidField(
                () => create("Classic", `https://example.com/${"a".repeat(IMAGE_URL_MAX_LENGTH)}`),
                "imageUrl",
            );
            assert.equal((await drinks.findAll()).length, 0, "nothing must be saved");

            // A blank image URL means "no image": it must not be stored as an empty string.
            const drink = await create("Classic", "   ");
            assert.equal(drink.imageUrl, undefined);
            console.log("  OK: invalid values rejected, http refused, blank image stored as no image");
        },
    },
    {
        title: "A drink must offer at least one size",
        kind: "rejected",
        main: true,
        async run() {
            const { menu, options, drinks } = buildMenu();
            const catalog = await seedCatalog(options);

            const error = await expectRejected(
                () => menu.createDrink(basicDrinkInput(catalog, { sizeIds: [] })),
                DrinkWithoutSizesError,
            );
            assert.equal((await drinks.findAll()).length, 0);
            console.log("  OK: rejected ->", error.message);
        },
    },
    {
        title: "The total price of a drink must be above zero",
        kind: "rejected",
        async run() {
            const { menu, options, drinks } = buildMenu();
            const catalog = await seedCatalog(options);
            const freeType = await options.createDrinkType("Water", 0);
            const freeFlavor = await options.createDrinkFlavor("Plain", 0);

            const error = await expectRejected(
                () => menu.createDrink(basicDrinkInput(catalog, {
                    name: "Free water",
                    drinkTypeId: freeType.id,
                    drinkFlavorId: freeFlavor.id,
                })),
                PriceOutOfRangeError,
            );
            assert.equal((await drinks.findAll()).length, 0);
            console.log("  OK: rejected ->", error.message);

            // A free component is fine as long as the total is above zero.
            const drink = await menu.createDrink(basicDrinkInput(catalog, {
                name: "Plain matcha",
                drinkFlavorId: freeFlavor.id,
            }));
            assert.equal(drink.priceCents, 4500);
        },
    },
    {
        title: "Invalid option lists when creating a drink",
        kind: "rejected",
        async run() {
            const { menu, options, drinks } = buildMenu();
            const catalog = await seedCatalog(options);

            await expectInvalidField(
                () => menu.createDrink(basicDrinkInput(catalog, { sizeIds: [catalog.small.id, catalog.small.id] })),
                "sizeIds",
            );
            await expectInvalidField(
                () => menu.createDrink(basicDrinkInput(catalog, { milkTypeIds: [catalog.wholeMilk.id, catalog.wholeMilk.id] })),
                "milkTypeIds",
            );
            await expectInvalidField(
                () => menu.createDrink(basicDrinkInput(catalog, {
                    extras: [
                        { extraId: catalog.coldFoam.id, includedQuantity: 1 },
                        { extraId: catalog.coldFoam.id, includedQuantity: 0 },
                    ],
                })),
                "extras",
            );
            await expectInvalidField(
                () => menu.createDrink(basicDrinkInput(catalog, { extras: [{ extraId: catalog.coldFoam.id, includedQuantity: -1 }] })),
                "includedQuantity",
            );
            await expectInvalidField(
                () => menu.createDrink(basicDrinkInput(catalog, { extras: [{ extraId: catalog.coldFoam.id, includedQuantity: 0.5 }] })),
                "includedQuantity",
            );

            // Cold foam allows 2 at most, so 3 cannot come included.
            const error = await expectRejected(
                () => menu.createDrink(basicDrinkInput(catalog, { extras: [{ extraId: catalog.coldFoam.id, includedQuantity: 3 }] })),
                ExtraQuantityExceededError,
            );
            assert.equal((await drinks.findAll()).length, 0, "nothing must be saved");
            console.log("  OK: repeated ids and bad quantities rejected ->", error.message);
        },
    },
];
