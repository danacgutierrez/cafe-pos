import { InMemoryDrinkRepository } from "./infrastructure/menu/memory/in-memory-drink.repository.js";
import { InMemoryDrinkTypeRepository } from "./infrastructure/menu/memory/in-memory-drink-type.repository.js";
import { InMemoryFlavorRepository } from "./infrastructure/menu/memory/in-memory-flavor.repository.js";
import { InMemorySizeRepository } from "./infrastructure/menu/memory/in-memory-size.repository.js";
import { InMemoryMilkTypeRepository } from "./infrastructure/menu/memory/in-memory-milk-type.repository.js";
import { InMemorySweetenerRepository } from "./infrastructure/menu/memory/in-memory-sweetener.repository.js";
import { AlwaysUnusedChecker } from "./infrastructure/menu/memory/always-unused-checker.js";
import { AlwaysAvailableStockChecker } from "./infrastructure/menu/memory/always-available-stock-checker.js";
import { DuplicateDrinkError } from "./domain/menu/errors/duplicate-drink-error.js";
import { EmptyRecipeError } from "./domain/menu/errors/empty-recipe-error.js";
import { InactiveOptionError } from "./domain/menu/errors/inactive-option-error.js";
import { MilkNotAllowedError } from "./domain/menu/errors/milk-not-allowed-error.js";
import { InUseError } from "./domain/menu/errors/in-use-error.js";
import { MenuService } from "./domain/menu/services/menu.service.js";
import { InMemoryExtraRepository } from "./infrastructure/menu/memory/in-memory-extra.repository.js";

// Wires the Menu module only, with in-memory repos and stub checkers
// (AlwaysAvailableStockChecker / AlwaysUnusedChecker). Inventory has its own scenario file;
// these get combined once Menu and Inventory are integrated together.

function buildService() {
  const drinkRepo = new InMemoryDrinkRepository();
  const drinkTypeRepo = new InMemoryDrinkTypeRepository();
  const flavorRepo = new InMemoryFlavorRepository();
  const sizeRepo = new InMemorySizeRepository();
  const milkTypeRepo = new InMemoryMilkTypeRepository();
  const sweetenerRepo = new InMemorySweetenerRepository();
  const extraRepo = new InMemoryExtraRepository();   

  const service = new MenuService(
    drinkRepo,
    drinkTypeRepo,
    flavorRepo,
    sizeRepo,
    milkTypeRepo,
    sweetenerRepo,
    extraRepo,
    new AlwaysAvailableStockChecker(),
    new AlwaysUnusedChecker(),
  );

  return { service, drinkRepo, drinkTypeRepo, flavorRepo, sizeRepo, milkTypeRepo, extraRepo };
}

async function scenario1_createAndActivateDrink() {
  console.log("\n=== Scenario 1: create and activate a drink ===");
  const { service } = buildService();

  const drinkType = await service.createDrinkType("Matcha");
  const flavor = await service.createFlavor("Mango");

  const drink = await service.createDrink(
    "Matcha Mango",
    60,
    "Matcha latte with mango puree",
    drinkType.id,
    flavor.id,
    150,
    [{ id: "recipe-1", drinkId: "will-be-ignored", ingredientId: "ing-matcha", quantity: 5 }],
  );
  console.log("  Created drink, isActive:", drink.isActive, "(expected: false)");

  await service.activateDrink(drink.id);
  const activated = await service.getOrderableDrink(drink.id);
  console.log("  After activation, isActive:", activated.isActive, "(expected: true)");
}

async function scenario2_duplicateDrink() {
  console.log("\n=== Scenario 2: duplicate type+flavor combination (rejected) ===");
  const { service } = buildService();

  const drinkType = await service.createDrinkType("Chai");
  const flavor = await service.createFlavor("Normal");

  await service.createDrink("Chai Normal", 50, "Classic chai", drinkType.id, flavor.id, 130, [
    { id: "r1", drinkId: "x", ingredientId: "ing-chai", quantity: 10 },
  ]);

  try {
    await service.createDrink("Chai Normal Copy", 55, "Duplicate", drinkType.id, flavor.id, 130, [
      { id: "r2", drinkId: "x", ingredientId: "ing-chai", quantity: 10 },
    ]);
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof DuplicateDrinkError) {
      console.log("  Correctly rejected:", e.message);
    } else {
      throw e;
    }
  }
}

async function scenario3_activateWithoutRecipe() {
  console.log("\n=== Scenario 3: activate drink without recipe (rejected) ===");
  const { service } = buildService();

  const drinkType = await service.createDrinkType("Latte");
  const flavor = await service.createFlavor("Vanilla");

  const drink = await service.createDrink(
    "Vanilla Latte",
    55,
    "No recipe yet",
    drinkType.id,
    flavor.id,
    180,
    [],
  );

  try {
    await service.activateDrink(drink.id);
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof EmptyRecipeError) {
      console.log("  Correctly rejected:", e.message);
    } else {
      throw e;
    }
  }
}

async function scenario4_orderInactiveDrink() {
  console.log("\n=== Scenario 4: order an inactive drink (rejected) ===");
  const { service } = buildService();

  const drinkType = await service.createDrinkType("Matcha");
  const flavor = await service.createFlavor("Strawberry");

  const drink = await service.createDrink(
    "Matcha Strawberry",
    60,
    "Never activated",
    drinkType.id,
    flavor.id,
    150,
    [{ id: "r1", drinkId: "x", ingredientId: "ing-matcha", quantity: 5 }],
  );

  try {
    await service.getOrderableDrink(drink.id);
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof InactiveOptionError) {
      console.log("  Correctly rejected:", e.message);
    } else {
      throw e;
    }
  }
}

async function scenario5_milkNotAllowed() {
  console.log("\n=== Scenario 5: request milk on a drink that does not allow it (rejected) ===");
  const { service } = buildService();

  const drinkType = await service.createDrinkType("Iced Tea");
  const flavor = await service.createFlavor("Lemon");

  const drink = await service.createDrink(
    "Iced Tea Lemon",
    40,
    "No milk allowed",
    drinkType.id,
    flavor.id,
    null,
    [{ id: "r1", drinkId: "x", ingredientId: "ing-tea", quantity: 8 }],
  );
  await service.activateDrink(drink.id);

  const size = await service.createSize("Medium", 1, 0);
  const milkType = await service.createMilkType("Oat", 10, "ing-oat-milk");

  try {
    await service.validateOrderOption(drink, size.id, milkType.id, null);
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof MilkNotAllowedError) {
      console.log("  Correctly rejected:", e.message);
    } else {
      throw e;
    }
  }
}

async function scenario6_deactivateAndReactivateFlavor() {
  console.log("\n=== Scenario 6: deactivate and reactivate a flavor ===");
  const { service, flavorRepo } = buildService();

  const flavor = await service.createFlavor("Banana");
  await service.deactivateFlavor(flavor.id);

  const afterDeactivate = await flavorRepo.findById(flavor.id);
  console.log("  isActive after deactivate:", afterDeactivate?.isActive, "(expected: false)");

  await service.activateFlavor(flavor.id);

  const afterActivate = await flavorRepo.findById(flavor.id);
  console.log("  isActive after reactivate:", afterActivate?.isActive, "(expected: true)");
}

async function scenario7_priceCalculation() {
  console.log("\n=== Scenario 7: price calculation ===");
  const { service } = buildService();

  const drinkType = await service.createDrinkType("Matcha");
  const flavor = await service.createFlavor("Mango");
  const drink = await service.createDrink("Matcha Mango", 60, "desc", drinkType.id, flavor.id, 150, [
    { id: "r1", drinkId: "x", ingredientId: "ing-matcha", quantity: 5 },
  ]);
  await service.activateDrink(drink.id);

  const size = await service.createSize("Large", 1.5, 10);
  const milkType = await service.createMilkType("Almond", 10, "ing-almond-milk");
  const sweetener = await service.createSweetener("Stevia", 5, 2, "ing-stevia");

  const { size: validSize, milkType: validMilk, sweetener: validSweetener } =
    await service.validateOrderOption(drink, size.id, milkType.id, sweetener.id);

  const total = service.calculatePrice(drink, validSize, validMilk, validSweetener);
  console.log("  Total price:", total, "(expected: 60 + 10 + 10 + 5 = 85)");
}

async function scenario8_validExtras() {
  console.log("\n=== Scenario 8: order with valid extras ===");
  const { service } = buildService();

  const drinkType = await service.createDrinkType("Matcha");
  const flavor = await service.createFlavor("Mango");
  const drink = await service.createDrink("Matcha Mango", 60, "desc", drinkType.id, flavor.id, 150, [
    { id: "r1", drinkId: "x", ingredientId: "ing-matcha", quantity: 5 },
  ]);
  await service.activateDrink(drink.id);

  const size = await service.createSize("Medium", 1, 0);
  const coldFoam = await service.createExtra("Cold foam", 15);
  const extraShot = await service.createExtra("Extra shot", 10);

  const { size: validSize } = await service.validateOrderOption(drink, size.id, null, null);
  const validatedExtras = await service.validateExtras([coldFoam.id, extraShot.id]);

  const total = service.calculatePrice(drink, validSize, null, null, validatedExtras);
  console.log("  Total price:", total, "(expected: 60 + 15 + 10 = 85)");
}

async function scenario9_inactiveExtra() {
  console.log("\n=== Scenario 9: order with a deactivated extra (rejected) ===");
  const { service } = buildService();

  const seasonalExtra = await service.createExtra("Pumpkin spice", 12);
  await service.deactivateExtra(seasonalExtra.id);

  try {
    await service.validateExtras([seasonalExtra.id]);
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof InactiveOptionError) {
      console.log("  Correctly rejected:", e.message);
    } else {
      throw e;
    }
  }
}

async function main() {
  await scenario1_createAndActivateDrink();
  await scenario2_duplicateDrink();
  await scenario3_activateWithoutRecipe();
  await scenario4_orderInactiveDrink();
  await scenario5_milkNotAllowed();
  await scenario6_deactivateAndReactivateFlavor();
  await scenario7_priceCalculation();
  await scenario8_validExtras();
  await scenario9_inactiveExtra();
}

main();