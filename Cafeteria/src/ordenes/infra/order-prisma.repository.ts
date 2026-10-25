import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; 
import { OrderRepository } from '../dominio/order.repository'; 
import { Order, LoyaltyProgram } from '../dominio/entidades';
import { Product } from 'src/productos/dominio/entidades'; 
import { Client } from 'src/generado/prisma/client';

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(datos: any): Promise<Order> {
    const orderBd = await this.prisma.order.create({
      data: {
        scheduleTime: datos.scheduleTime,
        notes: datos.notes ?? '',
        total: datos.total,
        deliveryNotes: datos.deliveryNotes ?? '',
        deliveryMode: datos.deliveryMode,
        deliveryFee: datos.deliveryFee,
        fulfillmentType: datos.fulfillmentType,
        idClient: datos.idClient,
        
        orderDetails: {
          create: datos.orderDetails.map((detail: any) => ({
            quantity: detail.quantity,
            price: detail.price,
            idProduct: detail.idProduct,
          })),
        },

        ...(datos.loyaltyTransactions && datos.loyaltyTransactions.length > 0 && {
          loyaltyTransactions: {
            create: datos.loyaltyTransactions.map((tx: any) => ({
              idClient: tx.idClient,
              idLoyaltyProgram: tx.idLoyaltyProgram,
              transactionType: tx.transactionType,
              pointsEarned: tx.pointsEarned,
              balanceAfter: tx.balanceAfter,
            })),
          }
        }),
      },
      include: {
        orderDetails: true,
        loyaltyTransactions: true,
      },
    });

    return orderBd as unknown as Order;
  }

  async findAll(): Promise<Order[]> {
    const ordersBd = await this.prisma.order.findMany({
      include: {
        orderDetails: true,
        loyaltyTransactions: true,
      },
    });

    return ordersBd as unknown as Order[];
  }

  async findProduct(id: number): Promise<Product | null> {
    const productBd = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!productBd) {
      return null;
    }

    return productBd as Product;
  }

  async findLoyaltyProgramActive(): Promise<LoyaltyProgram | null> {
    const programBd = await this.prisma.loyaltyProgram.findFirst({
      where: { isActive: true },
    });

    if (!programBd) {
      return null;
    }

    return programBd as unknown as LoyaltyProgram;
  }

  async findClientById(id: number): Promise<Client | null> {
    const clientBd = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!clientBd) {
      return null;
    }

    return clientBd as unknown as Client;
  }

  async updateClientBalance(idClient: number, newBalance: number): Promise<Client> {
    const clientBd = await this.prisma.client.update({
      where: { id: idClient },
      data: { loyaltyBalance: newBalance },
    });

    return clientBd as unknown as Client;
  }

  async findById(id: number): Promise<Order | null> {
    const orderBd = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderDetails: true,
        loyaltyTransactions: true,
      },
    });

    if (!orderBd) {
      return null;
    }

    return orderBd as unknown as Order;
  }

  async cancel(id: number): Promise<Order | null> {
    try {
      const orderBd = await this.prisma.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
        include: {
          orderDetails: true,
          loyaltyTransactions: true,
        },
      });

      return orderBd as unknown as Order;
    } catch (error) {
      return null;
    }
  }

  async completeOrderWithPoints(
    idOrder: number,
    idClient: number,
    idLoyaltyProgram: number,
    pointsEarned: number,
    newBalance: number
  ): Promise<Order> {

    const orderBd = await this.prisma.$transaction(async (tx) => {
      // Cambiar estado de la orden
      const updatedOrder = await tx.order.update({
        where: { id: idOrder },
        data: { status: 'COMPLETED' },
        include: {
          orderDetails: true,
          loyaltyTransactions: true
        }
      });

      // Registrar la transacción de puntos
      await tx.loyaltyTransaction.create({
        data: {
          idClient: idClient,
          idOrder: idOrder,
          idLoyaltyProgram: idLoyaltyProgram,
          transactionType: 'EARN',
          pointsEarned: pointsEarned,
          balanceAfter: newBalance
        }
      });

      // Actualizar el saldo del cliente
      await tx.client.update({
        where: { id: idClient },
        data: { loyaltyBalance: newBalance }
      });

      return updatedOrder;
    });

    return orderBd as unknown as Order;
  }

  async completeOrder(id: number): Promise<Order> {
    const orderBd = await this.prisma.order.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: { 
        orderDetails: true,
        loyaltyTransactions: true 
      }
    });

    return orderBd as unknown as Order;
  }
}