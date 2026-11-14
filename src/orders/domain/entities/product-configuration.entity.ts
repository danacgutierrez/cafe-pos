/** An extra the client ADDS on top of what the drink already includes. */
export interface ConfiguredExtra {
    extraId: string;
    /** Units the client pays for. The units the drink includes are not listed here. */
    addedQuantity: number;
}

/** What every product configuration shares. New product kinds extend this without touching the rest. */
export interface BaseProductConfiguration {
    kind: string;
    notes?: string;
}

/** A drink as the client customized it. Only ids: prices live in OrderDetail. */
export interface DrinkConfiguration extends BaseProductConfiguration {
    kind: "drink";
    drinkId: string;
    sizeId: string;
    /** Required when the drink offers milk; absent when it takes none. */
    milkTypeId?: string;
    sweetenerId?: string;
    extras: ConfiguredExtra[];
}

/** Today only drinks exist; a new product kind is added to this union. */
export type ProductConfiguration = DrinkConfiguration;