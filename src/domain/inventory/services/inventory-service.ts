import { randomUUID } from "node:crypto";
import { IngredientRepository } from "../ports/ingredient-repository.js";
import { Ingredient, MeasurementUnit } from "../entities/ingredient.entity.js";
import { DuplicateIngredientError } from "../errors/duplicate-ingredient-error.js";
import { NonPositiveQuantityError } from "../errors/non-positive-quantity-error.js";
import { InsufficientStockError } from "../errors/insufficient-stock-error.js";
import { NotFoundError } from "../../shared/not-found-error.js";

export class InventoryService {
    constructor(private readonly ingredients: IngredientRepository) { }

    // Rule: an entry must add a positive quantity (rejects 0 and negative values).
    async registerEntry(ingredientId: string, quantity: number): Promise<void> {
        if (quantity <= 0) {
            throw new NonPositiveQuantityError(quantity);
        }

        const ingredient = await this.ingredients.findById(ingredientId);
        if (!ingredient) {

            throw new NotFoundError("Ingredient", ingredientId);
        }

        const stockBefore = ingredient.currentStock;
        const stockAfter = stockBefore + quantity;

        await this.ingredients.adjustStock(ingredientId, stockAfter, {
            id: randomUUID(),
            ingredientId,
            createdAt: new Date(),
            stockBefore,
            stockAfter,
        });
    }

    // Rule: stock can never go negative. Computed before calling the repository,
    // so a rejected deduction never touches persisted data.
    async decreaseStock(ingredientId: string, quantity: number): Promise<void> {
        const ingredient = await this.ingredients.findById(ingredientId);
        if (!ingredient) {
            throw new NotFoundError("Ingredient", ingredientId);
        }

        const stockBefore = ingredient.currentStock;
        const stockAfter = stockBefore - quantity;

        if (stockAfter < 0) {
            throw new InsufficientStockError(ingredientId, quantity, stockBefore);
        }

        await this.ingredients.adjustStock(ingredientId, stockAfter, {
            id: randomUUID(),
            ingredientId,
            createdAt: new Date(),
            stockBefore,
            stockAfter,
        });
    }

    async listLowStock() {
        return this.ingredients.findLowStock();
    }
    
    // Two independent rules checked here: no duplicate name+unit, and no ingredient created with
    // zero or negative initial stock.
    async createIngredient(name: string, measureType: MeasurementUnit, currentStock: number, minStock: number): Promise<Ingredient> {
        const existing = await this.ingredients.findByNameAndUnit(name, measureType);

        if (existing) {
            throw new DuplicateIngredientError(name, measureType);
        }

        if (currentStock <= 0) {
            throw new NonPositiveQuantityError(minStock);
        }

        const ingredient: Ingredient = {
            id: randomUUID(),
            name,
            measureType,
            currentStock,
            minStock
        };

        return this.ingredients.save(ingredient);
    }
}