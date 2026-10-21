import { Product } from '../../productos/dominio/entidades';
import { Order } from './entidades';
import { NewOrder } from './entidades';

export interface OrderRepository {
    save(datos: NewOrder): Promise<Order>;
    findAll(): Promise<Order[]>;
    findProduct(id: number): Promise<Product | null>;
}