export interface Extra {
    readonly id: string;
    name: string;
    isActive: boolean;
    /** Price of ONE unit when the customer adds it. */
    priceCents: number;
    /** Most units of this extra a single drink can have (included + added). */
    maxQuantity: number;
}
