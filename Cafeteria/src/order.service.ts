import { OrderRepository } from './order.repository';
import { Order, OrderDetail, Client, OrderStatus, DeliveryMode, FulfillmentType} from './entidades';
import { ProductRepository } from './product.repository';
import { EmptyOrderError, DomainError, InactiveProductError } from './errores';

export class OrderService {
    constructor(
        private orderRepository: OrderRepository,
        private productRepository: ProductRepository
    ) {}

    createOrder(client: Client, details: { productName: string, quantity: number, price: number }[]): Order {
        if (!details || details.length === 0) {
            throw new EmptyOrderError();
        }

        const orderDetails: OrderDetail[] = [];
        let totalAmount = 0;

        for (const detail of details) {
            const product = this.productRepository.findById(detail.productName);

            if (!product) {
                throw new DomainError(`El producto '${detail.productName}' no existe en el catálogo.`);
            }

            if (!product.isActive) {
                throw new InactiveProductError(product.name);
            }

            orderDetails.push({
                quantity: detail.quantity,
                price: detail.price,
                order: {} as Order,
                product: product
            });

            totalAmount += (detail.quantity * detail.price);
        }

        const newOrder = new Order();
        newOrder.client = client;
        newOrder.orderDetails = orderDetails;
        newOrder.total = totalAmount;
        newOrder.status = OrderStatus.PENDING;
        newOrder.createdAt = new Date();
        newOrder.deliveryMode = DeliveryMode.PICKUP;
        newOrder.fulfillmentType = FulfillmentType.IMMEDIATE;

        this.orderRepository.save(newOrder);

        return newOrder;
    }
}