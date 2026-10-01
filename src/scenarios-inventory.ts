import { InMemoryIngredientRepository } from "./infrastructure/inventory/memory/in-memory-ingredient.repository.js";
import { DuplicateIngredientError } from "./domain/inventory/errors/duplicate-ingredient-error.js";
import { InventoryService } from "./domain/inventory/services/inventory-service.js";
import { NonPositiveQuantityError } from "./domain/inventory/errors/non-positive-quantity-error.js";
import { InsufficientStockError } from "./domain/inventory/errors/insufficient-stock-error.js";

function buildService() {
  const repo = new InMemoryIngredientRepository();
  const service = new InventoryService(repo);
  return { service, repo };
}

async function scenario1_createIngredient() {
  console.log("\n=== Scenario 1: create ingredient ===");
  const { service } = buildService();

  const ingredient = await service.createIngredient("Oat milk", "mililiters", 1000, 500);
  console.log("  Created:", ingredient.name, "- initial stock:", ingredient.currentStock, "(expected: 1000)");
}

async function scenario2_duplicateIngredient() {
  console.log("\n=== Scenario 2: duplicate ingredient (rejected) ===");
  const { service } = buildService();

  await service.createIngredient("Oat milk", "mililiters", 1000, 500);

  try {
    await service.createIngredient("Oat milk", "mililiters", 300, 100);
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof DuplicateIngredientError) {
      console.log("  Correctly rejected:", e.message);
    } else {
      throw e;
    }
  }
}

async function scenario3_registerEntry() {
  console.log("\n=== Scenario 3: register valid entry ===");
  const { service, repo } = buildService();

  const ingredient = await service.createIngredient("Matcha powder", "grams", 50, 10);
  await service.registerEntry(ingredient.id, 200);

  const updated = await repo.findById(ingredient.id);
  console.log("  Stock after entry:", updated?.currentStock, "(expected: 250 = 50 initial + 200)");
}

async function scenario4_nonPositiveInitialStock() {
  console.log("\n=== Scenario 4: create with invalid initial stock (rejected) ===");
  const { service } = buildService();

  try {
    await service.createIngredient("Mango puree", "mililiters", 0, 100);
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof NonPositiveQuantityError) {
      console.log("  Correctly rejected:", e.message);
    } else {
      throw e;
    }
  }
}

async function scenario5_decreaseStock() {
  console.log("\n=== Scenario 5: decrease available stock ===");
  const { service, repo } = buildService();

  const ingredient = await service.createIngredient("Almond milk", "mililiters", 200, 100);
  await service.registerEntry(ingredient.id, 500);
  await service.decreaseStock(ingredient.id, 150);

  const updated = await repo.findById(ingredient.id);
  console.log("  Stock after decrease:", updated?.currentStock, "(expected: 550)");
}

async function scenario6_insufficientStock() {
  console.log("\n=== Scenario 6: decrease more than available (rejected) ===");
  const { service, repo } = buildService();

  const ingredient = await service.createIngredient("Whole milk", "mililiters", 100, 200);
  await service.registerEntry(ingredient.id, 100);

  try {
    await service.decreaseStock(ingredient.id, 999);
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      console.log("  Correctly rejected:", e.message);
    } else {
      throw e;
    }
  }

  const updated = await repo.findById(ingredient.id);
  console.log("  Stock unchanged:", updated?.currentStock, "(expected: 200, nothing should have been deducted)");
}

async function scenario7_lowStockAlert() {
  console.log("\n=== Scenario 7: low stock alert ===");
  const { service } = buildService();

  await service.createIngredient("Vanilla", "mililiters", 20, 100);
  await service.createIngredient("Cinnamon", "grams", 500, 10);

  const lowStockList = await service.listLowStock();
  console.log("  Low stock ingredients:", lowStockList.map((i) => i.name));
  console.log("  (expected: only 'Vanilla')");
}

async function main() {
  await scenario1_createIngredient();
  await scenario2_duplicateIngredient();
  await scenario3_registerEntry();
  await scenario4_nonPositiveInitialStock();
  await scenario5_decreaseStock();
  await scenario6_insufficientStock();
  await scenario7_lowStockAlert();
}

main();