export enum OrderStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export enum DeliveryMode {
    PICKUP = 'PICKUP',
    DELIVERY = 'DELIVERY'
}

export enum FulfillmentType {
    IMMEDIATE = 'IMMEDIATE',
    SCHEDULED = 'SCHEDULED'
}

export class Order {
    id!: number;
    scheduleTime!: Date;
    notes!: string;
    total!: number;
    deliveryNotes!: string;
    deliveryMode!: DeliveryMode;
    deliveryFee!: number;
    status!: OrderStatus;
    fulfillmentType!: FulfillmentType;
    createdAt!: Date;
    
    // Relaciones
    idClient!: number;
    idLoyaltyTransaction?: number;
    orderDetails!: OrderDetail[];
}

export abstract class OrderDetail {
    id!: number;
    quantity!: number;
    price!: number;
    
    // Relaciones
    idOrder!: number;
    idProduct!: number;
}

export type NewOrder = Omit<Order, 'id' | 'createdAt' | 'status'>;
