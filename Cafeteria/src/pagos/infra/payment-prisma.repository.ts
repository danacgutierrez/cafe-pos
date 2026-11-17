import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DatosPago, Payment, PaymentMethod, PaymentStatus, ResumenPago } from '../dominio/entidades';
import { OrderNotFoundError } from '../dominio/errores';
import { PedidoParaPago, PaymentRepository } from '../dominio/payment.repository';

@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findOrder(idOrder: number): Promise<PedidoParaPago | null> {
        const pedido = await this.prisma.order.findUnique({ where: { id: idOrder } });
        return pedido
            ? { id: pedido.id, idClient: pedido.idClient, total: Number(pedido.total), status: pedido.status }
            : null;
    }

    async create(datos: DatosPago): Promise<Payment> {
        const fila = await this.prisma.payment.create({ data: datos });
        return this.aPago(fila);
    }

    async findById(id: number): Promise<Payment | null> {
        const fila = await this.prisma.payment.findUnique({ where: { id } });
        return fila ? this.aPago(fila) : null;
    }

    async findByOrder(idOrder: number): Promise<Payment[]> {
        const filas = await this.prisma.payment.findMany({
            where: { idOrder },
            orderBy: { createdAt: 'desc' },
        });
        return filas.map((fila) => this.aPago(fila));
    }

    async findApprovedByProvider(providerPaymentId: string): Promise<Payment | null> {
        const fila = await this.prisma.payment.findFirst({
            where: { providerPaymentId, status: PaymentStatus.APPROVED },
        });
        return fila ? this.aPago(fila) : null;
    }

    async findByProvider(providerPaymentId: string): Promise<Payment | null> {
        const fila = await this.prisma.payment.findFirst({ where: { providerPaymentId } });
        return fila ? this.aPago(fila) : null;
    }

    async updateStatus(id: number, status: PaymentStatus): Promise<Payment> {
        const fila = await this.prisma.payment.update({ where: { id }, data: { status } });
        return this.aPago(fila);
    }

    async summary(idOrder: number): Promise<ResumenPago> {
        const pedido = await this.findOrder(idOrder);

        if (!pedido) {
            throw new OrderNotFoundError();
        }

        const totalAprobado = await this.prisma.payment.aggregate({
            where: { idOrder, status: PaymentStatus.APPROVED },
            _sum: { amount: true },
        });
        const approved = Number(totalAprobado._sum.amount ?? 0);

        return { paid: approved >= pedido.total, total: pedido.total, approved };
    }

    private aPago(fila: {
        id: number;
        idOrder: number;
        method: string;
        amount: number;
        status: string;
        providerPaymentId: string | null;
        createdAt: Date;
    }): Payment {
        return {
            id: fila.id,
            idOrder: fila.idOrder,
            method: fila.method as PaymentMethod,
            amount: Number(fila.amount),
            status: fila.status as PaymentStatus,
            providerPaymentId: fila.providerPaymentId,
            createdAt: fila.createdAt,
        };
    }
}
