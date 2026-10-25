import { Inject, Injectable } from '@nestjs/common';
import type { OrderRepository } from './dominio/order.repository';
import { Order, OrderDetail, DeliveryMode, FulfillmentType, EarnMode, TransactionType, NewLoyaltyTransaction, LoyaltyTransaction} from '../ordenes/dominio/entidades';
import { EmptyOrderError, InactiveProductError, InvalidOrderStatusError, InvalidPointsToEarn, NonClientFoundError, NonExistentProductError, NonOrderFoundError } from './dominio/errores';
import { CreateOrderDto } from './dto/create-order.dto';
import { ORDER_REPOSITORY } from './orders.tokens';

@Injectable()
export class OrdersService {
    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly repo: OrderRepository,
    ) {}

    async createOrder(dto: CreateOrderDto): Promise<Order> {
        if (!dto.details || dto.details.length === 0) {
            throw new EmptyOrderError();
        }

        const orderDetails: OrderDetail[] = [];
        let totalAmount = 0;

        for (const detail of dto.details) {
            const product = await this.repo.findProduct(detail.idProduct);

            if (!product) {
                throw new NonExistentProductError();
            }

            if (!product.isActive) {
                throw new InactiveProductError(product.name);
            }

            totalAmount += (detail.quantity * detail.price);

            orderDetails.push({
                id: 0,
                idOrder: 0,
                idProduct: product.id,
                quantity: detail.quantity,
                price: detail.price,
            } as OrderDetail);
        }

        const client = await this.repo.findClientById(dto.idClient);

        if (!client) {
            throw new NonClientFoundError();
        }

        let newBalance = client.loyaltyBalance;
        const loyaltyTransactions: any[] = [];

        // Canjeo de puntos
        if (dto.usePoints) {
            const loyaltyProgramActive = await this.repo.findLoyaltyProgramActive();

            if (!loyaltyProgramActive) {
                throw new Error('No hay un programa de lealtad activo');
            }

            if (newBalance < loyaltyProgramActive.pointsPerReward) {
                throw new Error('No tienes suficientes puntos para canjear');
            }

            // Restar los puntos necesarios
            const pointsToDeduct = loyaltyProgramActive.pointsPerReward;
            newBalance -= pointsToDeduct;

            if (loyaltyProgramActive.redeemMode === 'FREE_ITEM') {
                const freeProductId = dto.rewardProductId || 1;
                const freeProduct = await this.repo.findProduct(freeProductId);

                if (!freeProduct) throw new NonExistentProductError();

                // Añadir el producto
                orderDetails.push({
                    id: 0,
                    idOrder: 0,
                    idProduct: freeProduct.id,
                    quantity: 1,
                    price: 0, // Regalo
                } as OrderDetail);
            } else if (loyaltyProgramActive.redeemMode === 'DISCOUNT') {
                const discount = pointsToDeduct * loyaltyProgramActive.pointValue;
                totalAmount = Math.max(0, totalAmount - discount);
            }

            loyaltyTransactions.push({
                idClient: client.id,
                idLoyaltyProgram: loyaltyProgramActive.id,
                transactionType: 'REDEEM',
                pointsEarned: -pointsToDeduct, // Puntos en negativo
                balanceAfter: newBalance,
            });
        }

        const newOrder = {
            idClient: dto.idClient,
            orderDetails: orderDetails,
            total: totalAmount,
            deliveryMode: DeliveryMode.PICKUP,
            fulfillmentType: FulfillmentType.IMMEDIATE,
            scheduleTime: dto.scheduleTime ? new Date(dto.scheduleTime) : new Date(),
            loyaltyTransactions: loyaltyTransactions,
        };

        if (dto.usePoints) {
            this.repo.updateClientBalance(dto.idClient, newBalance);
        }

        return this.repo.save(newOrder);
    }

    findAll(): Promise<Order[]> {
        return this.repo.findAll();
    }

    async cancel(id: number): Promise<Order | null> {
        const order = await this.repo.findById(id);

        if (!order) {
            return null;
        }

        if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
            throw new InvalidOrderStatusError();
        }

        return await this.repo.cancel(id);
    }

    findById(id: number): Promise<Order | null> {
        return this.repo.findById(id);
    }

    async complete(id: number): Promise<Order | null> {
        const order = await this.repo.findById(id);

        if (!order) {
            return null;
        }

        if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
            throw new InvalidOrderStatusError();
        }

        const loyaltyProgramActive = await this.repo.findLoyaltyProgramActive();
        const client = await this.repo.findClientById(order.idClient);

        let pointsToEarn = 0;

        // Calcular si hay puntos para otorgar
        if (client && loyaltyProgramActive) {
            pointsToEarn = loyaltyProgramActive.earnMode === 'PER_ORDER'
                ? loyaltyProgramActive.earnValue
                : 0;
        }

        // Delegar al método correcto según si hay puntos o no
        if (pointsToEarn > 0 && loyaltyProgramActive && client) {
            const newBalance = client.loyaltyBalance + pointsToEarn;

            return await this.repo.completeOrderWithPoints(
                id,
                client.id,
                loyaltyProgramActive.id,
                pointsToEarn,
                newBalance
            );
        }

        return await this.repo.completeOrder(id);
    }
}