import { Ingredient, MeasurementUnit } from "../../../domain/inventory/entities/ingredient.entity.js";
import { InventoryMovement } from "../../../domain/inventory/entities/inventory-movement.entity.js";
import { IngredientRepository } from "../../../domain/inventory/ports/ingredient-repository.js";

export class InMemoryIngredientRepository implements IngredientRepository {
    private readonly ingredients = new Map<string, Ingredient>();
    private readonly movements: InventoryMovement[] = [];
    
    async findById(id: string): Promise<Ingredient | null> {
        return this.ingredients.get(id) ?? null;
    }

    async findAll(): Promise<Ingredient[]> {
        return [...this.ingredients.values()].map((i) => ({ ...i }));
    }

    async save(ingredient: Ingredient): Promise<Ingredient> {
        this.ingredients.set(ingredient.id, { ...ingredient});
        return { ...ingredient };
    }

    async delete(id: string): Promise<void> {
        this.ingredients.delete(id);
    }

    async adjustStock(ingredientId: string, newStock: number, movement: InventoryMovement): Promise<void> {
        const ingredient = this.ingredients.get(ingredientId);
        if(!ingredient) {
            throw new Error(`Ingredient ${ingredientId} doesn't exist`)
        }

        ingredient.currentStock = newStock;
        this.movements.push({ ...movement });
    }

    async findLowStock(): Promise<Ingredient[]> {
        return [...this.ingredients.values()]
        .filter((i) => i.currentStock <= i.minStock)
        .map((i) => ({ ...i }));    
    }

    async findByNameAndUnit(name: string, measureType: MeasurementUnit): Promise<Ingredient | null> {
        const found = [...this.ingredients.values()].find(
            (i) => i.name.toLowerCase() === name.toLowerCase() && i.measureType === measureType,
        );
        return found ? { ...found } : null;   
    }          
}