export interface MilkType {
    readonly id: string;
    name: string;
    isActive: boolean;
    /** Amount added to the drink price when this milk is chosen (0 for the regular one). */
    priceCents: number;
}
