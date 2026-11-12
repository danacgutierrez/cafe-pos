import { OrderRepository } from './order.repository';
import {
    Order,
    OrderDetail,
    Client,
    OrderStatus,
    DeliveryMode,
    FulfillmentType
} from './entidades';
import { ProductRepository } from './product.repository';
import {
    EmptyOrderError,
    InactiveProductError,
    ProductNotFoundError,
    InvalidQuantityError,
    InvalidProductPriceError
} from './errores';

export class OrderService {
    constructor(
        private orderRepository: OrderRepository,
        private productRepository: ProductRepository
    ) {}

    createOrder(
        client: Client,
        details: { productId: number; quantity: number }[]
    ): Order {
        if (!details || details.length === 0) {
            throw new EmptyOrderError();
        }

        const orderDetails: OrderDetail[] = [];
        let totalAmount = 0;

        for (const detail of details) {
            if (!Number.isInteger(detail.quantity) || detail.quantity <= 0) {
                throw new InvalidQuantityError();
            }

            const product = this.productRepository.findById(detail.productId);

            if (!product) {
                throw new ProductNotFoundError(detail.productId);
            }

            if (!product.isActive) {
                throw new InactiveProductError(product.name);
            }

            if (!Number.isFinite(product.price) || product.price < 0) {
                throw new InvalidProductPriceError(product.id);
            }

            orderDetails.push({
                quantity: detail.quantity,
                price: product.price,
                order: {} as Order,
                product
            });

            totalAmount += detail.quantity * product.price;
        }

        const newOrder = new Order();
        newOrder.client = client;
        newOrder.orderDetails = orderDetails;
        newOrder.total = totalAmount;
        newOrder.status = OrderStatus.PENDING;
        newOrder.createdAt = new Date();
        newOrder.deliveryMode = DeliveryMode.PICKUP;
        newOrder.fulfillmentType = FulfillmentType.IMMEDIATE;

        for (const detail of orderDetails) {
            detail.order = newOrder;
        }

        this.orderRepository.save(newOrder);

        return newOrder;
    }
}