import { Inject, Injectable } from '@nestjs/common';
import { PayloadJwt, Rol } from '../auth/dominio/usuario';
import { MenuService } from '../menu/servicio/menu.service';
import type { OrderRepository } from './dominio/order.repository';
import {
    DeliveryMode,
    EarnMode,
    FulfillmentType,
    Order,
    OrderDetail,
    NewLoyaltyTransaction,
    OrderStatus,
    RedeemMode,
    TransactionType,
} from './dominio/entidades';
import {
    EmptyOrderError,
    InactiveProductError,
    InsufficientPointsError,
    InvalidOrderDetailError,
    InvalidOrderStatusError,
    NoActiveLoyaltyProgramError,
    NonClientFoundError,
    NonExistentProductError,
} from './dominio/errores';
import { CreateOrderDto } from './dto/create-order.dto';
import { ORDER_REPOSITORY } from './orders.tokens';

@Injectable()
export class OrdersService {
    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly repo: OrderRepository,
        private readonly menuService: MenuService,
    ) {}

    async createOrder(dto: CreateOrderDto): Promise<Order> {
        if (!dto.details || dto.details.length === 0) {
            throw new EmptyOrderError();
        }

        const orderDetails: OrderDetail[] = [];
        let totalAmount = 0;

        for (const detail of dto.details) {
            if (Boolean(detail.idProduct) === Boolean(detail.idBeverage)) {
                throw new InvalidOrderDetailError();
            }

            let unitPrice: number;
            let idProduct: number | undefined;
            let idBeverage: number | undefined;
            let customization: string | undefined;

            if (detail.idBeverage) {
                // RN-01/RN-06/RN-07: el sistema valida opciones y calcula el
                // precio de la bebida personalizada; el cliente no lo fija.
                const cotizacion = await this.menuService.quote({
                    idBeverage: detail.idBeverage,
                    customization: detail.customization,
                });

                unitPrice = cotizacion.total;
                idBeverage = detail.idBeverage;
                customization = JSON.stringify(detail.customization ?? {});
            } else {
                const product = await this.repo.findProduct(detail.idProduct!);

                if (!product) {
                    throw new NonExistentProductError();
                }

                if (!product.isActive) {
                    throw new InactiveProductError(product.name);
                }

                unitPrice = product.price;
                idProduct = product.id;
            }

            totalAmount += detail.quantity * Number(unitPrice);

            orderDetails.push({
                id: 0,
                idOrder: 0,
                idProduct,
                idBeverage,
                customization,
                quantity: detail.quantity,
                price: Number(unitPrice),
            } as OrderDetail);
        }

        const client = await this.repo.findClientById(dto.idClient);

        if (!client) {
            throw new NonClientFoundError();
        }

        let newBalance = client.loyaltyBalance;
        const loyaltyTransactions: NewLoyaltyTransaction[] = [];

        // Canjeo de puntos
        if (dto.usePoints) {
            const loyaltyProgramActive = await this.repo.findLoyaltyProgramActive();

            if (!loyaltyProgramActive) {
                throw new NoActiveLoyaltyProgramError();
            }

            if (newBalance < loyaltyProgramActive.pointsPerReward) {
                throw new InsufficientPointsError();
            }

            // Restar los puntos necesarios
            const pointsToDeduct = loyaltyProgramActive.pointsPerReward;
            newBalance -= pointsToDeduct;

            if (loyaltyProgramActive.redeemMode === RedeemMode.FREE_ITEM) {
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
            } else if (loyaltyProgramActive.redeemMode === RedeemMode.DISCOUNT) {
                const discount = pointsToDeduct * loyaltyProgramActive.pointValue;
                totalAmount = Math.max(0, totalAmount - discount);
            }

            loyaltyTransactions.push({
                idClient: client.id,
                idLoyaltyProgram: loyaltyProgramActive.id,
                transactionType: TransactionType.REDEEM,
                pointsEarned: -pointsToDeduct, // Puntos en negativo
                balanceAfter: newBalance,
            });
        }

        const newOrder = {
            idClient: dto.idClient,
            orderDetails: orderDetails,
            total: totalAmount,
            notes: dto.notes,
            deliveryNotes: dto.deliveryNotes,
            deliveryMode: dto.deliveryMode ?? DeliveryMode.PICKUP,
            fulfillmentType: dto.fulfillmentType ?? FulfillmentType.IMMEDIATE,
            scheduleTime: dto.scheduleTime ? new Date(dto.scheduleTime) : new Date(),
            loyaltyTransactions: loyaltyTransactions,
        };

        if (dto.usePoints) {
            await this.repo.updateClientBalance(dto.idClient, newBalance);
        }

        return this.repo.save(newOrder);
    }

    findAll(): Promise<Order[]> {
        return this.repo.findAll();
    }

    // Los clientes solo ven sus propios pedidos; el listado general sigue
    // siendo exclusivo de administración en GET /orders.
    async findMine(usuario: PayloadJwt): Promise<Order[]> {
        if (!usuario.idClient) {
            if (usuario.rol === Rol.client) {
                throw new NonClientFoundError();
            }
            return [];
        }

        return this.repo.findByClient(usuario.idClient);
    }

    async cancel(id: number): Promise<Order | null> {
        const order = await this.repo.findById(id);

        if (!order) {
            return null;
        }

        // RN-14: solo se puede cancelar mientras esté recibido (PENDING).
        if (order.status !== OrderStatus.PENDING) {
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

        // RN-12: el estado solo avanza de READY a COMPLETED; no se saltan pasos.
        if (order.status !== OrderStatus.READY) {
            throw new InvalidOrderStatusError();
        }

        const loyaltyProgramActive = await this.repo.findLoyaltyProgramActive();
        const client = await this.repo.findClientById(order.idClient);

        let pointsToEarn = 0;

        // RN-36/RN-41: PER_ORDER otorga una cantidad fija; AMOUNT_SPENT
        // calcula sobre lo realmente pagado (el total ya viene descontado).
        if (client && loyaltyProgramActive) {
            pointsToEarn = loyaltyProgramActive.earnMode === EarnMode.PER_ORDER
                ? loyaltyProgramActive.earnValue
                : order.total * loyaltyProgramActive.earnValue;
            pointsToEarn = Math.round(pointsToEarn * 100) / 100;
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