import { DrinkDetail } from "./drink-detail.entity.js";
import { Product } from "./product.entity.js";

export interface Drink extends Product {
    // Discriminant field. TypeScript erases interfaces at compile time, so this string tag is what
    // lets code tell a Drink apart from other future Product subtypes at runtime (discriminated union).
    readonly kind: "drink";
    drinkTypeId: string;
    flavorId: string;

    // How much milk THIS drink uses (per base size) — this depends on the drink's recipe, not on
    // which MilkType the customer picks. The customer's choice only decides WHICH ingredient gets
    // deducted (see MilkType.ingredientId); the amount always comes from here. null = this drink
    // doesn't take milk at all.
    milkQuantity: number | null;
    
    recipe: DrinkDetail[];
}


