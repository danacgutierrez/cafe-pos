import { IsEnum, IsInt, IsOptional, IsPositive, IsString, Length } from 'class-validator';
import { PaymentMethod } from '../dominio/entidades';

export class CreatePaymentDto {
    @IsInt()
    @IsPositive()
    idOrder!: number;

    @IsEnum(PaymentMethod)
    method!: PaymentMethod;

    // RN-21: solo la referencia del proveedor. Nunca número, vencimiento ni CVV.
    @IsOptional()
    @IsString()
    @Length(1, 100)
    providerPaymentId?: string;
}

// RN-18/RN-23: el proveedor notifica el resultado; la referencia identifica
// de forma única el intento y permite ignorar reintentos duplicados.
export enum WebhookResult {
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export class PaymentWebhookDto {
    @IsString()
    @Length(1, 100)
    providerPaymentId!: string;

    @IsEnum(WebhookResult)
    result!: WebhookResult;
}

// RN-22: el monto lo calcula el sistema, por eso no aparece en el DTO.
