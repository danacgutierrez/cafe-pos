import { Product } from "../dominio/entidades";

export interface ProductResponseDto {
    id: number;
    name: string;
    price: number;
    description: string;
    isActive: boolean;
}

export function toProductDto(product: Product): ProductResponseDto {
    return {
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description,
        isActive: product.isActive,
    };
}