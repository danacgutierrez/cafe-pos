import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Product } from '../../productos/dominio/entidades';
import { Beverage } from '../../menu/dominio/entidades';
import { OrderStatus } from '../../ordenes/dominio/entidades';
import { PedidoParaEstado } from '../dominio/entidades';
import { StatusRepository } from '../dominio/status.repository';

@Injectable()
export class PrismaStatusRepository implements StatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrder(id: number): Promise<PedidoParaEstado | null> {
    const pedido = await this.prisma.order.findUnique({
      where: { id },
      include: { orderDetails: true },
    });

    if (!pedido) {
      return null;
    }

    return {
      id: pedido.id,
      idClient: pedido.idClient,
      status: pedido.status,
      total: Number(pedido.total),
      orderDetails: pedido.orderDetails.map((detalle) => ({
        idProduct: detalle.idProduct ?? undefined,
        idBeverage: detalle.idBeverage ?? undefined,
        quantity: detalle.quantity,
        price: Number(detalle.price),
      })),
    };
  }

  async hasCardPayment(idOrder: number): Promise<boolean> {
    const pago = await this.prisma.payment.findFirst({
      where: { idOrder, method: 'CARD' },
      select: { id: true },
    });
    return !!pago;
  }

  async approvedTotal(idOrder: number): Promise<number> {
    const total = await this.prisma.payment.aggregate({
      where: { idOrder, status: 'APPROVED' },
      _sum: { amount: true },
    });
    return Number(total._sum.amount ?? 0);
  }

  async findProduct(id: number): Promise<Product | null> {
    const producto = await this.prisma.product.findUnique({ where: { id } });
    return producto ? (producto as Product) : null;
  }

  async findBeverage(id: number): Promise<Beverage | null> {
    const bebida = await this.prisma.beverage.findUnique({ where: { id } });
    return bebida ? (bebida as Beverage) : null;
  }

  async updateStatus(id: number, status: OrderStatus): Promise<PedidoParaEstado> {
    const pedido = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: { orderDetails: true },
    });

    return {
      id: pedido.id,
      idClient: pedido.idClient,
      status: pedido.status,
      total: Number(pedido.total),
      orderDetails: pedido.orderDetails.map((detalle) => ({
        idProduct: detalle.idProduct ?? undefined,
        idBeverage: detalle.idBeverage ?? undefined,
        quantity: detalle.quantity,
        price: Number(detalle.price),
      })),
    };
  }
}
