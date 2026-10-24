import { Product } from "./product.entity";

/**
 * A drink IS one type + one flavor (e.g. "Banana pudding matcha").
 * The allowed* lists are the options the customer may pick for this drink:
 *  - sizes: at least one is always required.
 *  - milk types: empty means the drink takes no milk; otherwise one must be chosen.
 *  - sweeteners: optional for the customer; empty means none is offered.
 * Allowed extras (and how many come included) live in DrinkExtra.
 */
export interface Drink extends Product {
    drinkTypeId: string;
    drinkFlavorId: string;
    allowedSizeIds: string[];
    allowedMilkTypeIds: string[];
    allowedSweetenerIds: string[];
}
