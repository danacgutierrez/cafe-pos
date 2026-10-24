/**
 * Common base for anything sold on the menu.
 * It has no price on purpose: each kind of product derives its own price
 * from its components (see DrinkWithPrice), so a stored price can never go stale.
 */
export interface Product {
    readonly id: string;
    name: string;
    description: string;
    isActive: boolean;
    imageUrl?: string;
}
