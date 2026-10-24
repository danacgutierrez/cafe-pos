import { Drink } from "../entities/drink.entity";

/** Units of an extra that come with the drink at no extra cost. */
export interface IncludedExtra {
    extraId: string;
    name: string;
    quantity: number;
}

/**
 * A drink as the menu shows it. The price is calculated every time from its
 * components, and the type and flavor names let a screen group drinks
 * by category or list them one by one without extra queries.
 */
export interface DrinkWithPrice extends Drink {
    priceCents: number;
    isAvailable: boolean;
    drinkTypeName: string;
    drinkFlavorName: string;
    includedExtras: IncludedExtra[];
}
