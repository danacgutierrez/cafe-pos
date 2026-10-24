/**
 * Domain scenarios for the menu module: drink types, drink flavors and drinks.
 *
 * This is the ONLY file that knows the in-memory implementations
 * (see buildMenu). Swapping the persistence layer happens here.
 *
 * CONTRACT this file expects from your code (adjust the imports if your
 * file names differ):
 *
 *   MenuService(drinks, drinkTypes, drinkFlavors)
 *     createDrinkType(name, priceCents)
 *     createDrinkFlavor(name, priceCents)
 *     createDrink(name, description, drinkTypeId, drinkFlavorId, imageUrl?)
 *
 *   Every repository (in memory) exposes: findById, findByName, findAll, save.
 *   DrinkRepository also exposes findByTypeAndFlavor.
 *
 *   InvalidInputError must expose a public `field` property.
 *
 *   Entities: DrinkType / DrinkFlavor { id, name, isActive, priceCents }
 *             Drink { id, name, description, priceCents, isActive,
 *                     imageUrl?, drinkTypeId, drinkFlavorId }
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MenuService } from "./menu/menu.service";
import { InMemoryDrinkRepository } from "./menu/infra/in-memory-drink.repository";
import { InMemoryDrinkTypeRepository } from "./menu/infra/in-memory-drink-type.repository";
import { InMemoryDrinkFlavorRepository } from "./menu/infra/in-memory-drink-flavor.repository";

import { DuplicateDrinkError, InactiveOptionError } from "./menu/domain/errors";
import {
  DESCRIPTION_MAX_LENGTH,
  IMAGE_URL_MAX_LENGTH,
  MAX_PRICE_CENTS,
  NAME_MAX_LENGTH,
} from "./menu/domain/limits";
import { InvalidInputError } from "./shared/invalid-input-error";
import { DuplicateNameError } from "./shared/duplicate-name-error";
import { NotFoundError } from "./shared/not-found-error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds an empty menu. Each scenario starts from scratch. */
function buildMenu() {
  const drinks = new InMemoryDrinkRepository();
  const drinkTypes = new InMemoryDrinkTypeRepository();
  const drinkFlavors = new InMemoryDrinkFlavorRepository();
  const menu = new MenuService(drinks, drinkTypes, drinkFlavors);
  return { menu, drinks, drinkTypes, drinkFlavors };
}

/** Creates one valid type and one valid flavor, the basis of most scenarios. */
async function createBasics(menu: MenuService) {
  const type = await menu.createDrinkType("Hot coffee", 3000);
  const flavor = await menu.createDrinkFlavor("Vanilla", 500);
  return { type, flavor };
}

/**
 * Runs an action that MUST be rejected by a domain rule.
 * Fails if the action succeeds or throws an error of another class.
 */
async function expectRejected<T extends Error>(
  action: () => Promise<unknown>,
  expected: new (...args: never[]) => T,
): Promise<T> {
  let caught: unknown;
  try {
    await action();
  } catch (error) {
    caught = error;
  }
  if (caught === undefined) {
    throw new Error(`Expected ${expected.name}, but the operation succeeded`);
  }
  if (!(caught instanceof expected)) {
    throw new Error(`Expected ${expected.name}, got: ${String(caught)}`);
  }
  return caught;
}

/** Like expectRejected, but also checks which field was reported. */
async function expectInvalidField(
  action: () => Promise<unknown>,
  field: string,
): Promise<void> {
  const error = await expectRejected(action, InvalidInputError);
  assert.equal(error.field, field);
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

/** 1 (works): a drink is created; its price is the sum of type + flavor. */
async function scenario1(): Promise<void> {
  console.log("\n=== Scenario 1: create a valid drink ===");
  const { menu, drinks } = buildMenu();
  const { type, flavor } = await createBasics(menu);

  const drink = await menu.createDrink(
    "Vanilla latte",
    "Espresso with steamed milk and vanilla",
    type.id,
    flavor.id,
    "https://example.com/vanilla-latte.png",
  );

  assert.ok(drink.id.length > 0);
  assert.equal(drink.name, "Vanilla latte");
  assert.equal(drink.drinkTypeId, type.id);
  assert.equal(drink.drinkFlavorId, flavor.id);
  assert.equal(drink.priceCents, 3500, "price must be type (3000) + flavor (500)");
  assert.equal(drink.isActive, true);
  assert.equal(drink.imageUrl, "https://example.com/vanilla-latte.png");
  assert.equal((await drinks.findAll()).length, 1);
  console.log(`  OK: "${drink.name}" created, price ${drink.priceCents} cents`);
}

/** 2 (works): names are stored cleaned and in NFC form. */
async function scenario2(): Promise<void> {
  console.log("\n=== Scenario 2: names are normalized before saving ===");
  const { menu } = buildMenu();

  const spaced = await menu.createDrinkType("  Hot    coffee  ", 3000);
  assert.equal(spaced.name, "Hot coffee");

  // "e" + combining acute accent (4 characters once normalized to NFC)
  const decomposed = await menu.createDrinkFlavor("Cafe\u0301", 500);
  assert.equal(decomposed.name, "Caf\u00e9");
  assert.equal(decomposed.name.length, 4);
  console.log("  OK: spaces collapsed and accents composed");
}

/** 3 (rejected): a drink type name cannot repeat (case and accent variants too). */
async function scenario3(): Promise<void> {
  console.log("\n=== Scenario 3: duplicate drink type name (rejected) ===");
  const { menu, drinkTypes } = buildMenu();
  await menu.createDrinkType("Café", 3000);

  // Upper case + decomposed accent: must still count as the same name.
  const error = await expectRejected(
    () => menu.createDrinkType("CAFE\u0301", 2500),
    DuplicateNameError,
  );
  assert.equal((await drinkTypes.findAll()).length, 1, "the duplicate must not be saved");
  console.log("  OK: rejected ->", error.message);
}

/** 4 (rejected): a drink name cannot repeat. */
async function scenario4(): Promise<void> {
  console.log("\n=== Scenario 4: duplicate drink name (rejected) ===");
  const { menu, drinks } = buildMenu();
  const { type, flavor } = await createBasics(menu);
  const otherFlavor = await menu.createDrinkFlavor("Caramel", 600);
  await menu.createDrink("Signature latte", "House special", type.id, flavor.id);

  // Different flavor, so only the name collides.
  const error = await expectRejected(
    () => menu.createDrink("signature   LATTE", "Another one", type.id, otherFlavor.id),
    DuplicateNameError,
  );
  assert.equal((await drinks.findAll()).length, 1);
  console.log("  OK: rejected ->", error.message);
}

/** 5 (rejected): the same type + flavor combination cannot repeat. */
async function scenario5(): Promise<void> {
  console.log("\n=== Scenario 5: duplicate type + flavor combination (rejected) ===");
  const { menu, drinks } = buildMenu();
  const { type, flavor } = await createBasics(menu);
  await menu.createDrink("Vanilla latte", "Classic", type.id, flavor.id);

  // Different name, same combination.
  const error = await expectRejected(
    () => menu.createDrink("Vanilla delight", "Same ingredients", type.id, flavor.id),
    DuplicateDrinkError,
  );
  assert.equal((await drinks.findAll()).length, 1);
  console.log("  OK: rejected ->", error.message);
}

/** 6 (rejected): inactive type or flavor cannot be used; unknown ids are not found. */
async function scenario6(): Promise<void> {
  console.log("\n=== Scenario 6: inactive or unknown references (rejected) ===");
  const { menu, drinks, drinkTypes, drinkFlavors } = buildMenu();
  const { type, flavor } = await createBasics(menu);

  // There is no "deactivate" method yet, so the repository is used directly.
  await drinkFlavors.save({ ...flavor, isActive: false });
  const inactiveFlavor = await expectRejected(
    () => menu.createDrink("Vanilla latte", "Classic", type.id, flavor.id),
    InactiveOptionError,
  );
  console.log("  OK: inactive flavor ->", inactiveFlavor.message);

  await drinkFlavors.save({ ...flavor, isActive: true });
  await drinkTypes.save({ ...type, isActive: false });
  const inactiveType = await expectRejected(
    () => menu.createDrink("Vanilla latte", "Classic", type.id, flavor.id),
    InactiveOptionError,
  );
  console.log("  OK: inactive type ->", inactiveType.message);

  await drinkTypes.save({ ...type, isActive: true });
  await expectRejected(
    () => menu.createDrink("Vanilla latte", "Classic", randomUUID(), flavor.id),
    NotFoundError,
  );
  await expectRejected(
    () => menu.createDrink("Vanilla latte", "Classic", type.id, randomUUID()),
    NotFoundError,
  );
  console.log("  OK: unknown type and flavor ids -> NotFoundError");

  assert.equal((await drinks.findAll()).length, 0, "nothing must be saved");
}

/** 7 (rejected): invalid names and prices for types and flavors. */
async function scenario7(): Promise<void> {
  console.log("\n=== Scenario 7: invalid names and prices (rejected) ===");
  const { menu, drinkTypes } = buildMenu();

  await expectInvalidField(() => menu.createDrinkType("   ", 1000), "name");
  await expectInvalidField(
    () => menu.createDrinkType("a".repeat(NAME_MAX_LENGTH + 1), 1000),
    "name",
  );
  await expectInvalidField(() => menu.createDrinkType("Tea", 10.5), "priceCents");
  await expectInvalidField(() => menu.createDrinkType("Tea", -1), "priceCents");
  await expectInvalidField(() => menu.createDrinkType("Tea", Number.NaN), "priceCents");
  await expectInvalidField(
    () => menu.createDrinkFlavor("Mint", MAX_PRICE_CENTS + 1),
    "priceCents",
  );
  assert.equal((await drinkTypes.findAll()).length, 0, "nothing must be saved");

  // Exact limits must be accepted.
  const longest = await menu.createDrinkType("a".repeat(NAME_MAX_LENGTH), 0);
  assert.equal(longest.name.length, NAME_MAX_LENGTH);
  const priciest = await menu.createDrinkFlavor("Gold", MAX_PRICE_CENTS);
  assert.equal(priciest.priceCents, MAX_PRICE_CENTS);
  console.log("  OK: invalid values rejected, exact limits accepted");
}

/** 8 (rejected): invalid description and image URL for drinks. */
async function scenario8(): Promise<void> {
  console.log("\n=== Scenario 8: invalid description and image URL (rejected) ===");
  const { menu, drinks } = buildMenu();
  const { type, flavor } = await createBasics(menu);
  const create = (description: string, imageUrl?: string) =>
    menu.createDrink("Vanilla latte", description, type.id, flavor.id, imageUrl);

  await expectInvalidField(() => create("   "), "description");
  await expectInvalidField(() => create("d".repeat(DESCRIPTION_MAX_LENGTH + 1)), "description");
  await expectInvalidField(() => create("Classic", "not a url"), "imageUrl");
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
  console.log("  OK: invalid values rejected, blank image stored as no image");
}

async function main(): Promise<void> {
  await scenario1();
  await scenario2();
  await scenario3();
  await scenario4();
  await scenario5();
  await scenario6();
  await scenario7();
  await scenario8();
  console.log("\nAll scenarios passed.");
}

main().catch((error: unknown) => {
  console.error("\nFAILED:", error);
  process.exitCode = 1;
});