import { ProductRepository } from './product.repository';
import { Product } from './entidades';

export class InMemoryProductRepository implements ProductRepository {
    private products: Product[] = [];

    constructor(initialProducts: Product[]) {
        this.products = initialProducts;
    }

    findById(name: string): Product | null {
        return this.products.find(p => p.name === name) || null;
    }
}