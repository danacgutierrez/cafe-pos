
export interface Sweetener {
    readonly id: string;
    readonly ingredientId: string;
    name: string;
    extraPrice: number;
    quantity: number;
    isActive: boolean;
}