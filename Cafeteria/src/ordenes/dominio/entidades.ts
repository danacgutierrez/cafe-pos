export enum OrderStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    READY = 'READY',
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

export enum EarnMode {
    PER_ORDER = 'PER_ORDER',
    AMOUNT_SPENT = 'AMOUNT_SPENT'
}

export enum RedeemMode {
    DISCOUNT = 'DISCOUNT',
    FREE_ITEM = 'FREE_ITEM'
}

export enum TransactionType {
    EARN = 'EARN',
    REDEEM = 'REDEEM',
    REVERSE = 'REVERSE', // RN-42: cancelación o reembolso
    ADJUST = 'ADJUST'    // RN-44: corrección con motivo y responsable
}

export class Order {
    id!: number;
    scheduleTime!: Date;
    notes?: string;
    total!: number;
    deliveryNotes?: string;
    deliveryMode!: DeliveryMode;
    deliveryFee?: number;
    status!: OrderStatus;
    fulfillmentType!: FulfillmentType;
    createdAt!: Date;
    
    // Relaciones
    idClient!: number;
    idLoyaltyTransaction?: number;
    orderDetails!: OrderDetail[];
    loyaltyTransactions?: LoyaltyTransaction[];
}

export abstract class OrderDetail {
    id!: number;
    quantity!: number;
    price!: number;

    // Relaciones: idProduct o idBeverage (nunca ambos en una línea nueva).
    idOrder!: number;
    idProduct?: number;
    idBeverage?: number;
    customization?: string; // JSON con tamaño, leche, endulzante, extras y nota
}

// Al guardar, la BD todavia no asigno id/createdAt ni las relaciones.
export type NewOrder = Omit<Order, 'id' | 'createdAt' | 'status' | 'loyaltyTransactions'> & {
    loyaltyTransactions: NewLoyaltyTransaction[];
};

export class LoyaltyProgram {
    id!: number;
    name!: string;
    updatedAt!: Date;
    isActive!: boolean;
    earnMode!: EarnMode;
    earnValue!: number;
    redeemMode!: RedeemMode;
    pointsPerReward!: number;
    pointValue!: number;
    
    // Relaciones
    //loyaltyTransactions!: LoyaltyTransaction[];
}

export class LoyaltyTransaction {
    id!: number;
    pointsEarned!: number;
    balanceAfter!: number;
    transactionType!: TransactionType;
    createdAt!: Date;
    
    // Relaciones
    idClient!: number;
    idOrder!: number;
    idLoyaltyProgram!: number;
}

export type NewLoyaltyTransaction = Omit<LoyaltyTransaction, 'id' | 'createdAt' | 'idOrder'>;
