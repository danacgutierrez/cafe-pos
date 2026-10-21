import { ProductRepository } from '../dominio/product.repository';
import { Product } from '../dominio/entidades';

export class InMemoryProductRepository implements ProductRepository {

    private products: Product[] = [
        { id: 1, name: 'Hamburguesa Clásica', price: 8.5, description: "", isActive: true },
        { id: 2, name: 'Papas Fritas', price: 3.0, description: "", isActive: true },
        { id: 3, name: 'Bebida Mediana', price: 2.0, description: "", isActive: true },
    ];

    async findById(id: number): Promise<Product | null> {
        return this.products.find(p => p.id === id) || null;
    }

    async findAll(): Promise<Product[]> {
        return [...this.products];
    }
}