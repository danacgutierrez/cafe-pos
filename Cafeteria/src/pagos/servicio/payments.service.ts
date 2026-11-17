import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PayloadJwt, Rol } from '../../auth/dominio/usuario';
import { Payment, PaymentMethod, PaymentStatus } from '../dominio/entidades';
import {
    InvalidPaymentStatusError,
    MissingPaymentReferenceError,
    OrderNotFoundError,
    PaymentAlreadyProcessedError,
    PaymentNotFoundError,
    UnauthorizedPaymentError,
} from '../dominio/errores';
import { PAYMENT_REPOSITORY, type PaymentRepository } from '../dominio/payment.repository';
import { CreatePaymentDto, PaymentWebhookDto, WebhookResult } from '../dto/payment.dto';

@Injectable()
export class PaymentsService {
    constructor(@Inject(PAYMENT_REPOSITORY) private readonly repo: PaymentRepository) {}

    async create(dto: CreatePaymentDto, usuario: PayloadJwt): Promise<Payment> {
        const pedido = await this.repo.findOrder(dto.idOrder);

        if (!pedido) {
            throw new OrderNotFoundError();
        }

        // RN-20: el cliente no confirma su propio efectivo/transferencia.
        if (dto.method !== PaymentMethod.CARD && usuario.rol === Rol.client) {
            throw new UnauthorizedPaymentError();
        }

        // RN-22: el monto es el total congelado del pedido.
        const amount = pedido.total;

        if (dto.method === PaymentMethod.CARD) {
            if (!dto.providerPaymentId) {
                throw new MissingPaymentReferenceError();
            }

            // RN-23: una referencia aprobada no se procesa dos veces.
            if (await this.repo.findApprovedByProvider(dto.providerPaymentId)) {
                throw new PaymentAlreadyProcessedError();
            }
        }

        // RN-18: tarjeta espera aprobación; efectivo/transferencia confirman al registrar.
        const status = dto.method === PaymentMethod.CARD ? PaymentStatus.PENDING : PaymentStatus.APPROVED;

        return await this.repo.create({
            idOrder: pedido.id,
            method: dto.method,
            amount,
            status,
            providerPaymentId: dto.providerPaymentId,
        });
    }

    async approve(id: number, usuario: PayloadJwt): Promise<Payment> {
        this.soloStaff(usuario);
        const pago = await this.repo.findById(id);

        if (!pago) {
            throw new PaymentNotFoundError();
        }

        if (pago.status === PaymentStatus.APPROVED) {
            throw new PaymentAlreadyProcessedError();
        }

        if (pago.status !== PaymentStatus.PENDING) {
            throw new InvalidPaymentStatusError();
        }

        return await this.repo.updateStatus(id, PaymentStatus.APPROVED);
    }

    async reject(id: number, usuario: PayloadJwt): Promise<Payment> {
        this.soloStaff(usuario);
        const pago = await this.repo.findById(id);

        if (!pago) {
            throw new PaymentNotFoundError();
        }

        if (pago.status !== PaymentStatus.PENDING) {
            throw new InvalidPaymentStatusError();
        }

        return await this.repo.updateStatus(id, PaymentStatus.REJECTED);
    }

    // RN-18/RN-23: notificación del procesador de pagos. No recibe JWT
    // (es una llamada servidor a servidor) y es idempotente por referencia.
    async handleWebhook(dto: PaymentWebhookDto): Promise<Payment> {
        const pago = await this.repo.findByProvider(dto.providerPaymentId);

        if (!pago) {
            throw new PaymentNotFoundError();
        }

        const destino =
            dto.result === WebhookResult.APPROVED
                ? PaymentStatus.APPROVED
                : PaymentStatus.REJECTED;

        // Reintento del mismo evento: se devuelve el estado actual sin
        // volver a aprobar (evita descontar inventario o sumar puntos dos veces).
        if (pago.status === destino) {
            return pago;
        }

        if (pago.status !== PaymentStatus.PENDING) {
            throw new InvalidPaymentStatusError();
        }

        return await this.repo.updateStatus(pago.id, destino);
    }

    async findByOrder(idOrder: number, usuario: PayloadJwt) {
        await this.verificarAcceso(idOrder, usuario);
        return await this.repo.findByOrder(idOrder);
    }

    async summary(idOrder: number, usuario: PayloadJwt) {
        await this.verificarAcceso(idOrder, usuario);
        return await this.repo.summary(idOrder);
    }

    private soloStaff(usuario: PayloadJwt): void {
        if (usuario.rol !== Rol.staff && usuario.rol !== Rol.admin) {
            throw new UnauthorizedPaymentError();
        }
    }

    private async verificarAcceso(idOrder: number, usuario: PayloadJwt): Promise<void> {
        const pedido = await this.repo.findOrder(idOrder);

        if (!pedido) {
            throw new OrderNotFoundError();
        }

        if (
            usuario.rol !== Rol.admin &&
            usuario.rol !== Rol.staff &&
            usuario.idClient !== pedido.idClient
        ) {
            throw new ForbiddenException('Solo puedes ver los pagos de tus propios pedidos');
        }
    }
}
