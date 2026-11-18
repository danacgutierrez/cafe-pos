export enum PaymentMethod {
    CARD = 'CARD',
    CASH = 'CASH',
    TRANSFER = 'TRANSFER',
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    REFUNDED = 'REFUNDED',
}

export class Payment {
    id!: number;
    idOrder!: number;
    method!: PaymentMethod;
    amount!: number;
    status!: PaymentStatus;
    providerPaymentId?: string | null; // RN-21: referencia, nunca datos de tarjeta
    createdAt!: Date;
}

export interface DatosPago {
    idOrder: number;
    method: PaymentMethod;
    amount: number;
    status: PaymentStatus;
    providerPaymentId?: string;
}

export interface ResumenPago {
    paid: boolean;
    total: number;
    approved: number;
}
