import { Inject, Injectable } from '@nestjs/common';
import type { OrderRepository } from './dominio/order.repository';
import { Order, OrderDetail, OrderStatus, DeliveryMode, FulfillmentType} from '../ordenes/dominio/entidades';
import { EmptyOrderError, DomainError, InactiveProductError, NonExistentProductError } from './dominio/errores';
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

        const newOrder = new Order();
        newOrder.idClient = dto.idClient;
        newOrder.orderDetails = orderDetails;
        newOrder.total = totalAmount;
        newOrder.status = OrderStatus.PENDING;
        newOrder.createdAt = new Date();
        newOrder.deliveryMode = DeliveryMode.PICKUP;
        newOrder.fulfillmentType = FulfillmentType.IMMEDIATE;
        newOrder.scheduleTime = dto.scheduleTime ? new Date(dto.scheduleTime) : new Date();

        return this.repo.save(newOrder);
    }

    findAll(): Promise<Order[]> {
        return this.repo.findAll();
    }
}