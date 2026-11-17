import { DatosPago, Payment, PaymentStatus, ResumenPago } from './entidades';

export interface PedidoParaPago {
    id: number;
    idClient: number;
    total: number;
    status: string;
}

export interface PaymentRepository {
    findOrder(idOrder: number): Promise<PedidoParaPago | null>;
    create(datos: DatosPago): Promise<Payment>;
    findById(id: number): Promise<Payment | null>;
    findByOrder(idOrder: number): Promise<Payment[]>;
    findApprovedByProvider(providerPaymentId: string): Promise<Payment | null>;
    findByProvider(providerPaymentId: string): Promise<Payment | null>;
    updateStatus(id: number, status: PaymentStatus): Promise<Payment>;
    summary(idOrder: number): Promise<ResumenPago>;
}

export const PAYMENT_REPOSITORY = 'PAYMENT_REPOSITORY';
