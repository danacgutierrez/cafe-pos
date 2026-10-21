import {
  Body,
  Controller,
  Delete,
  ForbiddenException, // NUEVO (Paso 5): el 403
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
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
        @Res({ passthrough: true }) res: Response,
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
}