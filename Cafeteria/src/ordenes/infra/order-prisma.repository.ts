import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; 
import { OrderRepository } from '../dominio/order.repository'; 
import { Order, NewOrder } from '../dominio/entidades';
import { Product } from 'src/productos/dominio/entidades'; 

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(datos: NewOrder): Promise<Order> {
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
        idLoyaltyTransaction: datos.idLoyaltyTransaction,
        
        orderDetails: {
          create: datos.orderDetails.map((detail) => ({
            quantity: detail.quantity,
            price: detail.price,
            idProduct: detail.idProduct,
          })),
        },
      },
      include: {
        orderDetails: true,
      },
    });

    return orderBd as unknown as Order;
  }

  async findAll(): Promise<Order[]> {
    const ordersBd = await this.prisma.order.findMany({
      include: {
        orderDetails: true,
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
}