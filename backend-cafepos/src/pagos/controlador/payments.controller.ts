import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Publico } from '../../auth/decoradores/publico.decorator';
import { Roles } from '../../auth/decoradores/roles.decorator';
import { UsuarioActual } from '../../auth/decoradores/usuario-actual.decorator';
import { Rol } from '../../auth/dominio/usuario';
import type { PayloadJwt } from '../../auth/dominio/usuario';
import { CreatePaymentDto, PaymentWebhookDto } from '../dto/payment.dto';
import { PaymentsService } from '../servicio/payments.service';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly service: PaymentsService) {}

    // RN-23: el proveedor confirma o rechaza; no lleva token de cliente.
    @Publico()
    @Post('webhook')
    @HttpCode(200)
    webhook(@Body() dto: PaymentWebhookDto) {
        return this.service.handleWebhook(dto);
    }

    @Post()
    create(@Body() dto: CreatePaymentDto, @UsuarioActual() usuario: PayloadJwt) {
        return this.service.create(dto, usuario);
    }

    @Roles(Rol.staff, Rol.admin)
    @Patch(':id/approve')
    approve(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: PayloadJwt) {
        return this.service.approve(id, usuario);
    }

    @Roles(Rol.staff, Rol.admin)
    @Patch(':id/reject')
    reject(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: PayloadJwt) {
        return this.service.reject(id, usuario);
    }

    // RN-24: el cliente ve intentos y si ya se cubrió el total.
    @Get('order/:idOrder/summary')
    summary(@Param('idOrder', ParseIntPipe) idOrder: number, @UsuarioActual() usuario: PayloadJwt) {
        return this.service.summary(idOrder, usuario);
    }

    @Get('order/:idOrder')
    findByOrder(@Param('idOrder', ParseIntPipe) idOrder: number, @UsuarioActual() usuario: PayloadJwt) {
        return this.service.findByOrder(idOrder, usuario);
    }
}
