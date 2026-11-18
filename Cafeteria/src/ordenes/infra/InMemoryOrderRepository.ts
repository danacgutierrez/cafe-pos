import { Injectable } from '@nestjs/common';
import type { Client } from '../../clientes/dominio/entidades';
import type { Product } from '../../productos/dominio/entidades';
import {
    EarnMode,
    LoyaltyProgram,
    LoyaltyTransaction,
    NewOrder,
    Order,
    OrderStatus,
    RedeemMode,
    TransactionType,
} from '../dominio/entidades';
import { NonClientFoundError, NonOrderFoundError } from '../dominio/errores';
import type { OrderRepository } from '../dominio/order.repository';

@Injectable()
export class InMemoryOrderRepository implements OrderRepository {
    private readonly products: Product[] = [
        { id: 1, name: 'Café Americano', price: 35, description: 'Café negro', isActive: true },
        { id: 2, name: 'Frappé de Fresa', price: 65, description: 'Frappé de temporada', isActive: true },
        { id: 3, name: 'Matcha Latte', price: 55, description: 'Té matcha con leche', isActive: true },
    ];

    private readonly clients: Client[] = [
        { id: 1, firstName: 'Karla', lastName: 'Duarte', loyaltyBalance: 10, phoneNumber: '1' },
        { id: 2, firstName: 'Sofia', lastName: 'Ibarra', loyaltyBalance: 0, phoneNumber: '2' },
    ];

    private readonly loyaltyProgram: LoyaltyProgram = {
        id: 1,
        name: 'Cliente Frecuente',
        updatedAt: new Date(),
        isActive: true,
        earnMode: EarnMode.PER_ORDER,
        earnValue: 1,
        redeemMode: RedeemMode.FREE_ITEM,
        pointsPerReward: 9,
        pointValue: 0,
    };

    private readonly orders: Order[] = [];
    private readonly loyaltyTransactions: LoyaltyTransaction[] = [];
    private siguienteIdOrden = 1;
    private siguienteIdDetalle = 1;
    private siguienteIdTransaccion = 1;

    async save(datos: NewOrder): Promise<Order> {
        const id = this.siguienteIdOrden++;

        const order: Order = {
            ...datos,
            id,
            status: OrderStatus.PENDING,
            createdAt: new Date(),
            orderDetails: datos.orderDetails.map(detail => ({
                ...detail,
                id: this.siguienteIdDetalle++,
                idOrder: id,
            })),
            loyaltyTransactions: [],
        };

        for (const tx of datos.loyaltyTransactions ?? []) {
            const transaction: LoyaltyTransaction = {
                ...tx,
                id: this.siguienteIdTransaccion++,
                idOrder: id,
                createdAt: new Date(),
            };
            this.loyaltyTransactions.push(transaction);
            order.loyaltyTransactions!.push(transaction);
        }

        this.orders.push(order);
        return order;
    }

    async findAll(): Promise<Order[]> {
        return [...this.orders];
    }

    async findById(id: number): Promise<Order | null> {
        return this.orders.find(order => order.id === id) ?? null;
    }

    async findByClient(idClient: number): Promise<Order[]> {
        return this.orders
            .filter(order => order.idClient === idClient)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async findProduct(id: number): Promise<Product | null> {
        return this.products.find(product => product.id === id) ?? null;
    }

    async findLoyaltyProgramActive(): Promise<LoyaltyProgram | null> {
        return this.loyaltyProgram.isActive ? this.loyaltyProgram : null;
    }

    async findClientById(id: number): Promise<Client | null> {
        return this.clients.find(client => client.id === id) ?? null;
    }

    async updateClientBalance(idClient: number, newBalance: number): Promise<Client> {
        const client = await this.findClientById(idClient);

        if (!client) {
            throw new NonClientFoundError();
        }

        client.loyaltyBalance = newBalance;
        return client;
    }

    async cancel(id: number): Promise<Order | null> {
        const order = await this.findById(id);

        if (!order) {
            return null;
        }

        order.status = OrderStatus.CANCELLED;
        return order;
    }

    async completeOrder(id: number): Promise<Order> {
        const order = await this.findById(id);

        if (!order) {
            throw new NonOrderFoundError();
        }

        order.status = OrderStatus.COMPLETED;
        return order;
    }

    async completeOrderWithPoints(
        idOrder: number,
        idClient: number,
        idLoyaltyProgram: number,
        pointsEarned: number,
        newBalance: number,
    ): Promise<Order> {
        const order = await this.completeOrder(idOrder);

        const transaction: LoyaltyTransaction = {
            id: this.siguienteIdTransaccion++,
            idOrder,
            idClient,
            idLoyaltyProgram,
            transactionType: TransactionType.EARN,
            pointsEarned,
            balanceAfter: newBalance,
            createdAt: new Date(),
        };

        this.loyaltyTransactions.push(transaction);
        order.loyaltyTransactions = [...(order.loyaltyTransactions ?? []), transaction];
        await this.updateClientBalance(idClient, newBalance);

        return order;
    }
}
