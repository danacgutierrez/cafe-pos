import { Product } from './entidades';

export interface ProductRepository {
    findById(id: number): Promise<Product | null>;
    findAll(): Promise<Product[]>;
}