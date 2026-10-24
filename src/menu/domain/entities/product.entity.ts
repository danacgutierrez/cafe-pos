export interface Product {
    readonly id: string;
    name: string;
    priceCents: number;
    description: string;
    isActive: boolean;
    imageUrl?: string;
}