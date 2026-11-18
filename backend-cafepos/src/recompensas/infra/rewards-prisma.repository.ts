import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    EarnMode,
    RedeemMode,
    TransactionType,
} from '../../ordenes/dominio/entidades';
import { NonClientFoundError } from '../../ordenes/dominio/errores';
import { DatosMovimiento, DatosPrograma, PointsMovement, RewardProgram } from '../dominio/entidades';
import { InvalidPointsAdjustmentError } from '../dominio/errores';
import { PedidoParaRecompensa, RewardsRepository } from '../dominio/rewards.repository';

@Injectable()
export class PrismaRewardsRepository implements RewardsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findOrder(idOrder: number): Promise<PedidoParaRecompensa | null> {
        const pedido = await this.prisma.order.findUnique({ where: { id: idOrder } });
        return pedido
            ? {
                  id: pedido.id,
                  idClient: pedido.idClient,
                  total: Number(pedido.total),
                  status: pedido.status,
              }
            : null;
    }

    async findActiveProgram(): Promise<RewardProgram | null> {
        const fila = await this.prisma.loyaltyProgram.findFirst({
            where: { isActive: true },
            orderBy: { id: 'desc' },
        });
        return fila ? this.aPrograma(fila) : null;
    }

    async findAllPrograms(): Promise<RewardProgram[]> {
        const filas = await this.prisma.loyaltyProgram.findMany({ orderBy: { id: 'desc' } });
        return filas.map((fila) => this.aPrograma(fila));
    }

    // RN-35: el programa anterior se desactiva, nunca se borra.
    async replaceActiveProgram(datos: DatosPrograma): Promise<RewardProgram> {
        const fila = await this.prisma.$transaction(async (tx) => {
            await tx.loyaltyProgram.updateMany({
                where: { isActive: true },
                data: { isActive: false },
            });
            return await tx.loyaltyProgram.create({ data: { ...datos, isActive: true } });
        });
        return this.aPrograma(fila);
    }

    async findBalance(idClient: number): Promise<number> {
        const cliente = await this.prisma.client.findUnique({ where: { id: idClient } });

        if (!cliente) {
            throw new NonClientFoundError();
        }

        return Number(cliente.loyaltyBalance);
    }

    async findMovements(idClient?: number): Promise<PointsMovement[]> {
        const filas = await this.prisma.loyaltyTransaction.findMany({
            where: idClient ? { idClient } : undefined,
            orderBy: { createdAt: 'desc' },
        });
        return filas.map((fila) => this.aMovimiento(fila));
    }

    async findMovementsByOrder(idOrder: number): Promise<PointsMovement[]> {
        const filas = await this.prisma.loyaltyTransaction.findMany({
            where: { idOrder },
            orderBy: { id: 'asc' },
        });
        return filas.map((fila) => this.aMovimiento(fila));
    }

    // RN-39 y RN-44:Movement y saldo cambian juntos; correcciones siempre
    // se registran como un movimiento nuevo.
    async applyMovement(datos: DatosMovimiento): Promise<PointsMovement> {
        return await this.prisma.$transaction(async (tx) => {
            const cliente = await tx.client.findUnique({ where: { id: datos.idClient } });

            if (!cliente) {
                throw new NonClientFoundError();
            }

            const saldoNuevo = Number(cliente.loyaltyBalance) + datos.pointsEarned;

            if (saldoNuevo < 0) {
                throw new InvalidPointsAdjustmentError();
            }

            await tx.client.update({
                where: { id: datos.idClient },
                data: { loyaltyBalance: saldoNuevo },
            });

            const fila = await tx.loyaltyTransaction.create({
                data: {
                    idClient: datos.idClient,
                    idOrder: datos.idOrder,
                    idLoyaltyProgram: datos.idLoyaltyProgram,
                    transactionType: datos.transactionType,
                    pointsEarned: datos.pointsEarned,
                    balanceAfter: saldoNuevo,
                    reason: datos.reason,
                    responsible: datos.responsible,
                },
            });

            return this.aMovimiento(fila);
        });
    }

    private aPrograma(fila: {
        id: number;
        name: string;
        isActive: boolean;
        earnMode: string;
        earnValue: number;
        redeemMode: string;
        pointsPerReward: number;
        pointValue: number;
    }): RewardProgram {
        return {
            ...fila,
            earnValue: Number(fila.earnValue),
            pointsPerReward: Number(fila.pointsPerReward),
            pointValue: Number(fila.pointValue),
            earnMode: fila.earnMode as EarnMode,
            redeemMode: fila.redeemMode as RedeemMode,
        };
    }

    private aMovimiento(fila: {
        id: number;
        idClient: number;
        idLoyaltyProgram: number;
        idOrder: number | null;
        transactionType: string;
        pointsEarned: number;
        balanceAfter: number;
        reason: string | null;
        responsible: string | null;
        createdAt: Date;
    }): PointsMovement {
        return {
            ...fila,
            pointsEarned: Number(fila.pointsEarned),
            balanceAfter: Number(fila.balanceAfter),
            transactionType: fila.transactionType as TransactionType,
        };
    }
}
