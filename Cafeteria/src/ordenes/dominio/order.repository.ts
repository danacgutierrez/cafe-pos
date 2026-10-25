import { Client } from 'src/generado/prisma/client';
import { Product } from '../../productos/dominio/entidades';
import { LoyaltyProgram, Order } from './entidades';
import { NewOrder } from './entidades';

export interface OrderRepository {
    save(datos: NewOrder): Promise<Order>;
    findAll(): Promise<Order[]>;
    findProduct(id: number): Promise<Product | null>;

    findLoyaltyProgramActive(): Promise<LoyaltyProgram | null>;
    findClientById(id: number): Promise<Client | null>;
    updateClientBalance(idClient: number, newBalance: number): Promise<Client>;
    cancel(id: number): Promise<Order | null>;
    findById(id: number): Promise<Order | null>;
    completeOrderWithPoints(
        idOrder: number,
        idClient: number,
        idLoyaltyProgram: number,
        pointsEarned: number,
        newBalance: number
    ): Promise<Order>;
    completeOrder(id: number): Promise<Order>;
}