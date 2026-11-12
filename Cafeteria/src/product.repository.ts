import { Product } from './entidades';

export interface ProductRepository {
    findById(id: number): Product | null;
}