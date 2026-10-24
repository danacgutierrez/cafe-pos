/** An extra a drink allows, and how many units come included in its price. */
export interface DrinkExtraInput {
    extraId: string;
    includedQuantity: number;
}

/** Everything needed to create a drink. Plain data: the service validates it. */
export interface CreateDrinkInput {
    name: string;
    description: string;
    drinkTypeId: string;
    drinkFlavorId: string;
    sizeIds: string[];
    milkTypeIds?: string[];
    sweetenerIds?: string[];
    extras?: DrinkExtraInput[];
    imageUrl?: string;
}
