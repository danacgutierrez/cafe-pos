export interface InventoryMovement {
    readonly id: string;
    readonly ingredientId: string;
    readonly createdAt: Date;
    stockBefore: number;
    stockAfter: number;
}