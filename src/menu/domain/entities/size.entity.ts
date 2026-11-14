export interface Size {
    readonly id: string;
    name: string;
    isActive: boolean;
    /** Amount added to the drink price when this size is chosen (0 for the base size). */
    priceCents: number;
}
