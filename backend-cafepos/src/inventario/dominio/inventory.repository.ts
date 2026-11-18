import { Consumption, Ingredient, InventoryMovement, MovementType } from './entidades';

export interface MoveDatos {
    movements: Consumption[];
    reason?: string;
    responsible?: string;
}

export interface MovementDatos {
    idIngredient: number;
    movementType: MovementType.WASTE | MovementType.ADJUSTMENT;
    quantity: number; // con signo: positivo entra, negativo sale
    reason: string;
    responsible: string;
}

export interface InventoryRepository {
    findAll(): Promise<Ingredient[]>;
    findById(id: number): Promise<Ingredient | null>;
    findMovements(idIngredient?: number): Promise<InventoryMovement[]>;
    averageDailyConsumption(idIngredient: number, days: number): Promise<number>;

    registerEntry(idIngredient: number, quantity: number, responsible?: string): Promise<InventoryMovement>;

    // RN-27: todo o nada. Si un insumo no alcanza, no se descuenta ninguno.
    consume(datos: MoveDatos): Promise<InventoryMovement[]>;
    returnStock(datos: MoveDatos): Promise<InventoryMovement[]>;

    // RN-30/RN-32: correcciones y mínimos los define la dueña.
    setMinStock(idIngredient: number, minStock: number): Promise<Ingredient>;
    registerMovement(datos: MovementDatos): Promise<InventoryMovement>;
}

export const INVENTORY_REPOSITORY = 'INVENTORY_REPOSITORY';
