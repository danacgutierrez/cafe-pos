import { Ingredient, MeasurementUnit } from "../entities/ingredient.entity.js";
import { InventoryMovement } from "../entities/inventory-movement.entity.js";
import { Repository } from "../../shared/repository.js";

export interface IngredientRepository extends Repository<Ingredient> {
    adjustStock(ingredientId: string, newStock: number, movement: InventoryMovement): Promise<void>;
    findLowStock(): Promise<Ingredient[]>;
    findByNameAndUnit(name: string, measureType: MeasurementUnit): Promise<Ingredient | null>; 
}