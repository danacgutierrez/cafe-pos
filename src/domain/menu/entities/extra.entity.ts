
// Catalog entry for an optional add-on (e.g. cold foam).
export interface Extra {
    readonly id: string;
    name: string;
    extraPrice: number;
    isActive: boolean;
}