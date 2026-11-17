import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Ingredient, InventoryMovement, MovementType } from '../dominio/entidades';
import {
    IngredientNotFoundError,
    InsufficientStockError,
    NegativeStockError,
} from '../dominio/errores';
import {
    InventoryRepository,
    MoveDatos,
    MovementDatos,
} from '../dominio/inventory.repository';

@Injectable()
export class PrismaInventoryRepository implements InventoryRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(): Promise<Ingredient[]> {
        return (await this.prisma.ingredient.findMany({ orderBy: { id: 'asc' } })) as Ingredient[];
    }

    async findById(id: number): Promise<Ingredient | null> {
        return await this.prisma.ingredient.findUnique({ where: { id } });
    }

    async findMovements(idIngredient?: number): Promise<InventoryMovement[]> {
        return (await this.prisma.inventoryMovement.findMany({
            where: idIngredient ? { idIngredient } : undefined,
            orderBy: { createdAt: 'desc' },
        })) as InventoryMovement[];
    }

    async averageDailyConsumption(idIngredient: number, days: number): Promise<number> {
        const desde = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const total = await this.prisma.inventoryMovement.aggregate({
            where: {
                idIngredient,
                movementType: MovementType.SALE,
                createdAt: { gte: desde },
            },
            _sum: { quantity: true },
        });
        return Math.abs(Number(total._sum.quantity ?? 0)) / days;
    }

    async registerEntry(idIngredient: number, quantity: number, responsible?: string): Promise<InventoryMovement> {
        const ingrediente = await this.prisma.ingredient.findUnique({ where: { id: idIngredient } });

        if (!ingrediente) {
            throw new IngredientNotFoundError();
        }

        const [movimiento] = await this.prisma.$transaction(async (tx) => {
            const actualizado = await tx.ingredient.update({
                where: { id: idIngredient },
                data: { stock: { increment: quantity } },
            });
            const creado = await tx.inventoryMovement.create({
                data: {
                    idIngredient,
                    movementType: MovementType.ENTRY,
                    quantity,
                    balanceAfter: actualizado.stock,
                    reason: 'Entrada de insumo',
                    responsible,
                },
            });
            return [creado];
        });

        return movimiento as InventoryMovement;
    }

    // RN-25, RN-27 y RN-28: validar todo antes de descontar para que no
    // quede existencia negativa ni un descuento parcial.
    async consume(datos: MoveDatos): Promise<InventoryMovement[]> {
        return await this.prisma.$transaction(async (tx) => {
            for (const movimiento of datos.movements) {
                const ingrediente = await tx.ingredient.findUnique({ where: { id: movimiento.idIngredient } });

                if (!ingrediente) {
                    throw new IngredientNotFoundError();
                }

                if (ingrediente.stock < movimiento.quantity) {
                    throw new InsufficientStockError(ingrediente.name);
                }
            }

            const creados: InventoryMovement[] = [];

            for (const movimiento of datos.movements) {
                const actualizado = await tx.ingredient.update({
                    where: { id: movimiento.idIngredient },
                    data: { stock: { decrement: movimiento.quantity } },
                });
                const creado = await tx.inventoryMovement.create({
                    data: {
                        idIngredient: movimiento.idIngredient,
                        movementType: MovementType.SALE,
                        quantity: -movimiento.quantity,
                        balanceAfter: actualizado.stock,
                        reason: datos.reason ?? 'Consumo por pedido',
                        responsible: datos.responsible,
                    },
                });
                creados.push(creado as InventoryMovement);
            }

            return creados;
        });
    }

    // RN-31: devolver insumos con un movimiento nuevo, nunca editando el anterior.
    async returnStock(datos: MoveDatos): Promise<InventoryMovement[]> {
        return await this.prisma.$transaction(async (tx) => {
            const creados: InventoryMovement[] = [];

            for (const movimiento of datos.movements) {
                const ingrediente = await tx.ingredient.findUnique({ where: { id: movimiento.idIngredient } });

                if (!ingrediente) {
                    throw new IngredientNotFoundError();
                }

                const actualizado = await tx.ingredient.update({
                    where: { id: movimiento.idIngredient },
                    data: { stock: { increment: movimiento.quantity } },
                });
                const creado = await tx.inventoryMovement.create({
                    data: {
                        idIngredient: movimiento.idIngredient,
                        movementType: MovementType.RETURN,
                        quantity: movimiento.quantity,
                        balanceAfter: actualizado.stock,
                        reason: datos.reason ?? 'Devolución por cancelación',
                        responsible: datos.responsible,
                    },
                });
                creados.push(creado as InventoryMovement);
            }

            return creados;
        });
    }

    async setMinStock(idIngredient: number, minStock: number): Promise<Ingredient> {
        const ingrediente = await this.prisma.ingredient.findUnique({ where: { id: idIngredient } });

        if (!ingrediente) {
            throw new IngredientNotFoundError();
        }

        return await this.prisma.ingredient.update({
            where: { id: idIngredient },
            data: { minStock },
        });
    }

    // RN-28/RN-30: mermas y ajustes nunca editan el movimiento anterior;
    // siempre generan uno nuevo con fecha, motivo y responsable.
    async registerMovement(datos: MovementDatos): Promise<InventoryMovement> {
        return await this.prisma.$transaction(async (tx) => {
            const ingrediente = await tx.ingredient.findUnique({
                where: { id: datos.idIngredient },
            });

            if (!ingrediente) {
                throw new IngredientNotFoundError();
            }

            const nuevoStock = Number(ingrediente.stock) + datos.quantity;
            if (nuevoStock < 0) {
                throw new NegativeStockError();
            }

            const actualizado = await tx.ingredient.update({
                where: { id: datos.idIngredient },
                data: { stock: nuevoStock },
            });

            const creado = await tx.inventoryMovement.create({
                data: {
                    idIngredient: datos.idIngredient,
                    movementType: datos.movementType,
                    quantity: datos.quantity,
                    balanceAfter: actualizado.stock,
                    reason: datos.reason,
                    responsible: datos.responsible,
                },
            });

            return creado as InventoryMovement;
        });
    }
}
