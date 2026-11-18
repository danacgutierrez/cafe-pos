import { ForbiddenException } from '@nestjs/common';
import { PayloadJwt, Rol } from '../../auth/dominio/usuario';
import {
    PaymentMethod,
    PaymentStatus,
} from '../dominio/entidades';
import {
    PaymentAlreadyProcessedError,
    UnauthorizedPaymentError,
} from '../dominio/errores';
import { WebhookResult } from '../dto/payment.dto';
import { PaymentsService } from './payments.service';

const cliente = (idClient: number | null = 1): PayloadJwt => ({
    sub: 1,
    correo: 'cliente@itson.mx',
    rol: Rol.client,
    idClient,
});
const staff = (): PayloadJwt => ({
    sub: 9,
    correo: 'staff@itson.mx',
    rol: Rol.staff,
    idClient: null,
});

describe('PaymentsService', () => {
    function build() {
        const repo = {
            findOrder: jest.fn().mockResolvedValue({ id: 5, idClient: 1, total: 12.5 }),
            findApprovedByProvider: jest.fn().mockResolvedValue(null),
            findById: jest.fn(),
            findByProvider: jest.fn(),
            create: jest.fn().mockImplementation(async (d) => ({ id: 1, createdAt: new Date(), ...d })),
            updateStatus: jest.fn().mockImplementation(async (id, status) => ({ id, status })),
            findByOrder: jest.fn(),
            summary: jest.fn(),
        };
        return { service: new PaymentsService(repo as any), repo };
    }

    describe('create', () => {
        it('usa el total congelado del pedido como monto (RN-22)', async () => {
            const { service, repo } = build();
            await service.create({ idOrder: 5, method: PaymentMethod.CASH }, cliente());
            expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 12.5 }));
        });

        it('CASH queda APPROVED al registrar (RN-21)', async () => {
            const { service } = build();
            const pago = await service.create({ idOrder: 5, method: PaymentMethod.CASH }, cliente());
            expect(pago.status).toBe(PaymentStatus.APPROVED);
        });

        it('CARD sin referencia genera DEMO- y queda APPROVED (modo demo)', async () => {
            const { service } = build();
            const pago = await service.create({ idOrder: 5, method: PaymentMethod.CARD }, cliente());
            expect(pago.status).toBe(PaymentStatus.APPROVED);
            expect(pago.providerPaymentId).toMatch(/^DEMO-/);
        });

        it('CARD con referencia de proveedor queda PENDING (RN-18)', async () => {
            const { service } = build();
            const pago = await service.create(
                { idOrder: 5, method: PaymentMethod.CARD, providerPaymentId: 'PROV-123' },
                cliente(),
            );
            expect(pago.status).toBe(PaymentStatus.PENDING);
            expect(pago.providerPaymentId).toBe('PROV-123');
        });

        it('rechaza una referencia ya aprobada (RN-23)', async () => {
            const { service, repo } = build();
            repo.findApprovedByProvider.mockResolvedValue({ id: 1 });
            await expect(
                service.create(
                    { idOrder: 5, method: PaymentMethod.CARD, providerPaymentId: 'PROV-123' },
                    cliente(),
                ),
            ).rejects.toBeInstanceOf(PaymentAlreadyProcessedError);
            expect(repo.create).not.toHaveBeenCalled();
        });

        it('un cliente no puede pagar el pedido de otro', async () => {
            const { service, repo } = build();
            repo.findOrder.mockResolvedValue({ id: 5, idClient: 2, total: 12.5 });
            await expect(
                service.create({ idOrder: 5, method: PaymentMethod.CASH }, cliente(1)),
            ).rejects.toBeInstanceOf(ForbiddenException);
            expect(repo.create).not.toHaveBeenCalled();
        });
    });

    describe('approve / reject', () => {
        it('solo personal autorizado puede aprobar', async () => {
            const { service } = build();
            await expect(service.approve(1, cliente())).rejects.toBeInstanceOf(UnauthorizedPaymentError);
        });

        it('staff aprueba un pago PENDING', async () => {
            const { service, repo } = build();
            repo.findById.mockResolvedValue({ id: 1, status: PaymentStatus.PENDING });
            await expect(service.approve(1, staff())).resolves.toMatchObject({
                status: PaymentStatus.APPROVED,
            });
            expect(repo.updateStatus).toHaveBeenCalledWith(1, PaymentStatus.APPROVED);
        });

        it('rechaza aprobar un pago ya aprobado', async () => {
            const { service, repo } = build();
            repo.findById.mockResolvedValue({ id: 1, status: PaymentStatus.APPROVED });
            await expect(service.approve(1, staff())).rejects.toBeInstanceOf(PaymentAlreadyProcessedError);
        });
    });

    describe('handleWebhook', () => {
        it('es idempotente: un reintento devuelve el pago sin reprocesarlo', async () => {
            const { service, repo } = build();
            const pago = { id: 1, status: PaymentStatus.APPROVED, providerPaymentId: 'PROV-123' };
            repo.findByProvider.mockResolvedValue(pago);

            await expect(
                service.handleWebhook({ providerPaymentId: 'PROV-123', result: WebhookResult.APPROVED }),
            ).resolves.toBe(pago);
            expect(repo.updateStatus).not.toHaveBeenCalled();
        });

        it('aprueba un pago PENDING tras el webhook', async () => {
            const { service, repo } = build();
            repo.findByProvider.mockResolvedValue({ id: 1, status: PaymentStatus.PENDING });

            await expect(
                service.handleWebhook({ providerPaymentId: 'PROV-123', result: WebhookResult.APPROVED }),
            ).resolves.toMatchObject({ status: PaymentStatus.APPROVED });
            expect(repo.updateStatus).toHaveBeenCalledWith(1, PaymentStatus.APPROVED);
        });
    });

    describe('acceso a pagos por pedido', () => {
        it('un cliente ve el resumen de su propio pedido', async () => {
            const { service, repo } = build();
            repo.summary.mockResolvedValue({ paid: true, total: 12.5, approved: 12.5 });
            await expect(service.summary(5, cliente(1))).resolves.toMatchObject({ paid: true });
        });

        it('un cliente no ve el resumen de un pedido ajeno', async () => {
            const { service, repo } = build();
            repo.findOrder.mockResolvedValue({ id: 5, idClient: 2, total: 12.5 });
            await expect(service.summary(5, cliente(1))).rejects.toBeInstanceOf(ForbiddenException);
        });
    });
});
