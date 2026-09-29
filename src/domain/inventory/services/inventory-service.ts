import { randomUUID } from "node:crypto";
import { IngredientRepository } from "../ports/ingredient-repository.js";
import { Ingredient, MeasurementUnit } from "../entities/ingredient.entity.js";
import { DuplicateIngredientError } from "../errors/duplicate-ingredient-error.js";
import { NonPositiveQuantityError } from "../errors/non-positive-quantity-error.js";
import { InsufficientStockError } from "../errors/insufficient-stock-error.js";

export class InventoryService {
    constructor(private readonly ingredients: IngredientRepository) {}

    async registerEntry(ingredientId: string, quantity: number): Promise<void> {
        if (quantity <= 0) {
            throw new NonPositiveQuantityError(quantity);
        }

        const ingredient = await this.ingredients.findById(ingredientId);
        if (!ingredient) {
            throw new Error(`Ingredient ${ingredientId} doesn't exist`);
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

    async decreaseStock(ingredientId: string, quantity: number): Promise<void> {
        const ingredient = await this.ingredients.findById(ingredientId);
        if(!ingredient) {
            throw new Error(`Ingredient ${ingredientId} doesn't exist`)
        }

        const stockBefore = ingredient.currentStock;
        const stockAfter = stockBefore - quantity;

        if(stockAfter < 0) {
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

    async createIngredient(name: string, measureType: MeasurementUnit, currentStock: number, minStock: number): Promise<Ingredient> {
        const existing = await this.ingredients.findByNameAndUnit(name, measureType);
        
        if(existing) {
            throw new DuplicateIngredientError(name, measureType);
        }

        if(currentStock <= 0 ) {
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