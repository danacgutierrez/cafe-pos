import { Order } from './entidades';

export interface OrderRepository {
    save(order: Order): void;
    findAll(): Order[];
}