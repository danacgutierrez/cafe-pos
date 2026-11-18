export enum MovementType {
    ENTRY = 'ENTRY',
    SALE = 'SALE',
    WASTE = 'WASTE',
    ADJUSTMENT = 'ADJUSTMENT',
    RETURN = 'RETURN',
}

export class Ingredient {
    id!: number;
    name!: string;
    stock!: number;
    minStock!: number;
}

// Un cambio de existencia (RN-30). quantity con signo: entra / sale.
export class InventoryMovement {
    id!: number;
    idIngredient!: number;
    movementType!: MovementType;
    quantity!: number;
    balanceAfter!: number;
    reason?: string;
    responsible?: string;
    createdAt!: Date;
}

export interface Consumption {
    idIngredient: number;
    quantity: number;
}

export const DIAS_CONSUMO = 7; // RN-33
export const DIAS_OBJETIVO = 14; // RN-34
