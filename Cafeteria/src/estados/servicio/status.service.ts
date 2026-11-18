import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PayloadJwt, Rol } from '../../auth/dominio/usuario';
import { Order, OrderStatus } from '../../ordenes/dominio/entidades';
import { NonOrderFoundError } from '../../ordenes/dominio/errores';
import { OrdersService } from '../../ordenes/orders.service';
import { Product } from '../../productos/dominio/entidades';
import { PedidoParaEstado, TRANSICIONES } from '../dominio/entidades';
import {
  ClientNotFoundError,
  InvalidStatusTransitionError,
  OrderAlreadyFinalError,
  PaymentNotApprovedError,
  UnauthorizedStatusChangeError,
} from '../dominio/errores';
import { STATUS_REPOSITORY, type StatusRepository } from '../dominio/status.repository';
import { ChangeStatusDto } from '../dto/status.dto';
import {
  RepeatOrderResponseDto,
  toStatusResponse,
} from '../dto/status-response.dto';

@Injectable()
export class StatusService {
  constructor(
    @Inject(STATUS_REPOSITORY) private readonly repo: StatusRepository,
    private readonly ordersService: OrdersService,
  ) {}

  async currentStatus(id: number, usuario: PayloadJwt) {
    const pedido = await this.repo.findOrder(id);

    if (!pedido) {
      throw new NonOrderFoundError();
    }

    this.verificarAcceso(pedido, usuario);
    return toStatusResponse(pedido);
  }

  async changeStatus(id: number, dto: ChangeStatusDto, usuario: PayloadJwt) {
    this.soloPersonal(usuario);

    const pedido = await this.repo.findOrder(id);

    if (!pedido) {
      throw new NonOrderFoundError();
    }

    const actual = pedido.status as OrderStatus;

    if (TRANSICIONES[actual].length === 0) {
      throw new OrderAlreadyFinalError();
    }

    if (!TRANSICIONES[actual].includes(dto.status)) {
      throw new InvalidStatusTransitionError(actual, dto.status);
    }

    // RN-19/RN-24: con tarjeta no se prepara ni se descuenta inventario
    // hasta que los pagos aprobados cubran el total del pedido.
    if (dto.status === OrderStatus.IN_PROGRESS && (await this.repo.hasCardPayment(id))) {
      const aprobado = await this.repo.approvedTotal(id);
      if (aprobado < pedido.total) {
        throw new PaymentNotApprovedError();
      }
    }

    // RN-14: cancelar usa el flujo original; solo es válido desde PENDING.
    if (dto.status === OrderStatus.CANCELLED) {
      const cancelado = await this.ordersService.cancel(id);
      return toStatusResponse(this.aPedidoParaEstado(cancelado!));
    }

    // RN-37: COMPLETED dispara los puntos, reutilizando OrdersService.
    if (dto.status === OrderStatus.COMPLETED) {
      const completado = await this.ordersService.complete(id);
      return toStatusResponse(this.aPedidoParaEstado(completado!));
    }

    const actualizado = await this.repo.updateStatus(id, dto.status);
    return toStatusResponse(actualizado);
  }

  // RN-17: repetir copia las líneas, recalcula con precios vigentes y avisa
  // de los productos que ya no están activos para pedir reemplazo.
  async repeatOrder(id: number, usuario: PayloadJwt): Promise<RepeatOrderResponseDto> {
    const pedido = await this.repo.findOrder(id);

    if (!pedido) {
      throw new NonOrderFoundError();
    }

    this.verificarAcceso(pedido, usuario);

    const productos = new Map<number, Product>();
    const detalles: RepeatOrderResponseDto['details'] = [];
    const warnings: string[] = [];
    let total = 0;

    for (const detalle of pedido.orderDetails) {
      let currentPrice = Number(detalle.price);
      let isActive = false;

      if (detalle.idProduct) {
        let producto = productos.get(detalle.idProduct);

        if (!producto) {
          producto = (await this.repo.findProduct(detalle.idProduct)) ?? undefined;
          if (producto) {
            productos.set(detalle.idProduct, producto);
          }
        }

        currentPrice = producto ? Number(producto.price) : 0;
        isActive = producto?.isActive ?? false;

        if (!producto || !isActive) {
          warnings.push(
            `El producto ${detalle.idProduct} ya no está activo; elige un reemplazo.`,
          );
        }
      } else if (detalle.idBeverage) {
        const bebida = await this.repo.findBeverage(detalle.idBeverage);
        currentPrice = bebida ? Number(bebida.basePrice) : currentPrice;
        isActive = bebida?.isActive ?? false;

        if (!bebida || !isActive) {
          warnings.push(
            `La bebida ${detalle.idBeverage} ya no está activa; elige un reemplazo.`,
          );
        }
      } else {
        warnings.push('Hay una línea sin producto ni bebida; revisa el pedido.');
      }

      if (isActive) {
        total += detalle.quantity * currentPrice;
      }

      detalles.push({
        idProduct: detalle.idProduct,
        idBeverage: detalle.idBeverage,
        quantity: detalle.quantity,
        previousPrice: Number(detalle.price),
        currentPrice,
        isActive,
      });
    }

    return {
      idClient: pedido.idClient,
      details: detalles,
      total: Math.round(total * 100) / 100,
      warnings,
    };
  }

  private aPedidoParaEstado(order: Order): PedidoParaEstado {
    return {
      id: order.id,
      idClient: order.idClient,
      status: order.status,
      total: Number(order.total),
      orderDetails: (order.orderDetails ?? []).map((detalle) => ({
        idProduct: detalle.idProduct,
        idBeverage: detalle.idBeverage,
        quantity: detalle.quantity,
        price: Number(detalle.price),
      })),
    };
  }

  private soloPersonal(usuario: PayloadJwt): void {
    if (usuario.rol !== Rol.staff && usuario.rol !== Rol.admin) {
      throw new UnauthorizedStatusChangeError();
    }
  }

  private verificarAcceso(pedido: PedidoParaEstado, usuario: PayloadJwt): void {
    if (
      usuario.rol !== Rol.admin &&
      usuario.rol !== Rol.staff &&
      usuario.idClient !== pedido.idClient
    ) {
      throw new ForbiddenException('Solo puedes consultar tus propios pedidos');
    }

    if (usuario.rol === Rol.client && !usuario.idClient) {
      throw new ClientNotFoundError();
    }
  }
}
