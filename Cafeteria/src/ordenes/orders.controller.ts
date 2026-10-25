import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator';
import { Rol, type PayloadJwt } from '../auth/dominio/usuario';
import { Roles } from 'src/auth/decoradores/roles.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { toOrderDto } from './dto/order-response.dto';

@Controller('orders')
export class OrdersController {
    constructor(private readonly service: OrdersService) {}

    @Post()
    @HttpCode(201)
    async create(
        @Body() dto: CreateOrderDto,
        @UsuarioActual() usuario: PayloadJwt,
    ) { 
        if (usuario.idClient !== dto.idClient) {
            throw new ForbiddenException('Solo puedes ordenar para ti mismo');
        }

        const order = await this.service.createOrder(dto);
        //res.setHeader('Location', `/orders/${order.id}`)
        return toOrderDto(order);
    }

    @Roles(Rol.admin)
    @Get()
    async findAll() {
        const lista = await this.service.findAll();
        return lista.map(toOrderDto);
    }

    @Patch(':id/cancel')
    async cancel(
        @Param('id', ParseIntPipe) id: number,
        @UsuarioActual() usuario: PayloadJwt
    ) {
        const orderToCancel = await this.service.findById(id);

        if (!orderToCancel) {
            throw new NotFoundException(`La orden con id ${id} no fue encontrada`);
        }

        if (usuario.rol !== 'admin' && usuario.idClient !== orderToCancel.idClient) {
            throw new ForbiddenException('Solo puedes cancelar tus propias órdenes');
        }

        const order = await this.service.cancel(id);

        return toOrderDto(order!);
    }

    @Roles(Rol.admin)
    @Patch(':id/complete')
    async complete(
        @Param('id', ParseIntPipe) id: number,
    ) {
        const order = await this.service.complete(id);

        if (!order) {
            throw new NotFoundException(`La orden con id ${id} no fue encontrada`);
        }

        return toOrderDto(order);
    }
}