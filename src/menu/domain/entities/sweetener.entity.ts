/** Each row is one sweetness level the customer can pick (e.g. "Light", "Extra sweet"). */
export interface Sweetener {
    readonly id: string;
    name: string;
    /** Sweetness order: a whole number, unique in the catalog. */
    level: number;
    isActive: boolean;
    priceCents: number;
}
