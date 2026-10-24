/**
 * Relation between a drink and an extra it allows. It is its own entity
 * because it carries data: how many units come included in the drink's price.
 * 0 means "allowed, but the customer pays for every unit".
 * It has no id of its own: the pair (drinkId, extraId) identifies it.
 */
export interface DrinkExtra {
    readonly drinkId: string;
    readonly extraId: string;
    includedQuantity: number;
}
