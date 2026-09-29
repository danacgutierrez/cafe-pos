import { Product } from './entidades';

export interface ProductRepository {
    findById(name: string): Product | null;
}