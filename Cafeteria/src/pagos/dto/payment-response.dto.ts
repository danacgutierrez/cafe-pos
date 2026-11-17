import { Payment, ResumenPago } from '../dominio/entidades';

export type PaymentResponseDto = Payment;
export type PaymentSummaryResponseDto = ResumenPago & { idOrder: number };
