import { Ingredient, InventoryMovement } from '../dominio/entidades';

export interface IngredientResponseDto {
    id: number;
    name: string;
    stock: number;
    minStock: number;
    isLow: boolean; // RN-32
    daysOfCoverage: number | null; // RN-33
    suggestedReplenishment: number; // RN-34
}

export function toIngredientDto(
    ingredient: Ingredient,
    consumoDiario: number,
    diasObjetivo: number,
): IngredientResponseDto {
    const coverage = consumoDiario > 0 ? ingredient.stock / consumoDiario : null;
    return {
        id: ingredient.id,
        name: ingredient.name,
        stock: ingredient.stock,
        minStock: ingredient.minStock,
        isLow: ingredient.stock <= ingredient.minStock,
        daysOfCoverage: coverage === null ? null : Number(coverage.toFixed(2)),
        suggestedReplenishment: Math.max(0, Math.ceil(diasObjetivo * consumoDiario - ingredient.stock)),
    };
}

export type MovementResponseDto = InventoryMovement;
