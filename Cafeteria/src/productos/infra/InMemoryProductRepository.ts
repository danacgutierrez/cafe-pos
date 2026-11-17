import { ProductRepository } from '../dominio/product.repository';
import { Product } from '../dominio/entidades';

export class InMemoryProductRepository implements ProductRepository {
    private products: Product[] = [
        { id: 1, name: 'Café Americano', price: 35, description: 'Café negro', isActive: true },
        { id: 2, name: 'Frappé de Fresa', price: 65, description: 'Frappé de temporada', isActive: true },
        { id: 3, name: 'Matcha Latte', price: 55, description: 'Té matcha con leche', isActive: true },
    ];

    async findById(id: number): Promise<Product | null> {
        return this.products.find(product => product.id === id) || null;
    }

    async findAll(): Promise<Product[]> {
        return [...this.products];
    }
}
