// Base type for anything sellable. Only Drink exists today; kept generic so future product
// types (e.g. a bagged tea) can extend it without changing this shape.
export interface Product {
    readonly id: string;
    name: string;
    price: number;
    description: string;
    isActive: boolean;
}