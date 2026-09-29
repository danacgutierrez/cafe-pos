// Enums para los tipos de datos definidos en el diagrama
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

export enum PaymentMethod {
    CASH = 'CASH',
    CREDIT_CARD = 'CREDIT_CARD',
    DEBIT_CARD = 'DEBIT_CARD',
    DIGITAL_WALLET = 'DIGITAL_WALLET'
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED'
}

export enum TransactionType {
    EARN = 'EARN',
    REDEEM = 'REDEEM'
}

export enum EarnMode {
    PER_ORDER = 'PER_ORDER',
    AMOUNT_SPENT = 'AMOUNT_SPENT'
}

export enum RedeemMode {
    DISCOUNT = 'DISCOUNT',
    FREE_ITEM = 'FREE_ITEM'
}

export enum MeasurementUnit {
    MILLILITERS = 'MILLILITERS',
    GRAMS = 'GRAMS',
    UNITS = 'UNITS'
}

// --- Usuarios ---

export abstract class User {
    username!: string;
    email!: string;
    password!: string;
}

export class Administrator extends User {}

export class Staff extends User {}

export class Client extends User {
    firstName!: string;
    lastName!: string;
    loyaltyBalance!: number;
    phoneNumber!: string;
    
    // Relaciones
    orders!: Order[];
    loyaltyTransactions!: LoyaltyTransaction[];
}

// --- Sistema de Lealtad ---

export class LoyaltyProgram {
    name!: string;
    updatedAt!: Date;
    isActive!: boolean;
    earnMode!: EarnMode;
    earnValue!: number;
    redeemMode!: RedeemMode;
    pointsPerReward!: number;
    pointValue!: number;
    
    // Relaciones
    loyaltyTransactions!: LoyaltyTransaction[];
}

export class LoyaltyTransaction {
    pointsEarned!: number;
    balanceAfter!: number;
    transactionType!: TransactionType;
    createdAt!: Date;
    
    // Relaciones
    client!: Client;
    order!: Order;
    loyaltyProgram!: LoyaltyProgram;
}

// --- Pedidos y Pagos ---

export class Order {
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
    client!: Client;
    statusHistory!: OrderStatusHistory[];
    orderDetails!: OrderDetail[];
    payment!: Payment;
    loyaltyTransaction?: LoyaltyTransaction;
}

export class OrderStatusHistory {
    status!: OrderStatus;
    changedAt!: Date;
    
    // Relaciones
    changedBy!: User;
    order!: Order;
}

export class Payment {
    method!: PaymentMethod;
    status!: PaymentStatus;
    amount!: number;
    createdAt!: Date;
    
    // Relaciones
    order!: Order;
}

// --- Detalles de Pedido ---

export abstract class OrderDetail {
    quantity!: number;
    price!: number;
    
    // Relaciones
    order!: Order;
    product!: Product;
}

export class DrinkOrderDetail extends OrderDetail {
    sweetnessLevel!: number;
    isFree!: boolean;
    
    // Relaciones
    milkType!: MilkType;
    size!: Size;
    sweetener!: Sweetener;
    extraDetails!: ExtraDetails[];
}

// --- Modificadores de Bebida ---

export class MilkType {
    name!: string;
    extraPrice!: number;
    isActive!: boolean;
}

export class Size {
    name!: string;
    factor!: number;
    extraPrice!: number;
    isActive!: boolean;
}

export class Sweetener {
    name!: string;
    extraPrice!: number;
    quantity!: number;
    isActive!: boolean;
}

export class Extra {
    name!: string;
    price!: number;
}

export class ExtraDetails {
    quantity!: number;
    price!: number;
    
    // Relaciones
    extra!: Extra;
    drinkOrderDetail!: DrinkOrderDetail;
}

// --- Catálogo y Productos ---

export abstract class Product {
    name!: string;
    price!: number;
    description!: string;
    isActive!: boolean;
}

export class Drink extends Product {
    extraPrice!: number;
    
    // Relaciones
    flavor!: Flavor;
    drinkType!: DrinkType;
    drinkDetails!: DrinkDetail[];
}

export class Flavor {
    name!: string;
    isActive!: boolean;
}

export class DrinkType {
    name!: string;
    isActive!: boolean;
}

export class DrinkDetail {
    quantity!: number;
    
    // Relaciones
    drink!: Drink;
    ingredient!: Ingredient;
}

// --- Inventario ---

export class Ingredient {
    name!: string;
    measureType!: MeasurementUnit;
    currentStock!: number;
    minStock!: number;
    
    // Relaciones
    inventoryMovements!: InventoryMovement[];
    drinkDetails!: DrinkDetail[];
}

export class InventoryMovement {
    createdAt!: Date;
    stockAfter!: number;
    stockBefore!: number;
    
    // Relaciones
    ingredient!: Ingredient;
}