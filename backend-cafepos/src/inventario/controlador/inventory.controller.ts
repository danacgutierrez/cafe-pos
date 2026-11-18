import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../auth/decoradores/roles.decorator';
import { UsuarioActual } from '../../auth/decoradores/usuario-actual.decorator';
import { Rol } from '../../auth/dominio/usuario';
import type { PayloadJwt } from '../../auth/dominio/usuario';
import {
    AdjustStockDto,
    MoveStockDto,
    RegisterEntryDto,
    RegisterWasteDto,
    SetMinStockDto,
} from '../dto/inventory.dto';
import { InventoryService } from '../servicio/inventory.service';

@Controller('inventory')
export class InventoryController {
    constructor(private readonly service: InventoryService) {}

    @Roles(Rol.admin, Rol.staff)
    @Get()
    list() {
        return this.service.list();
    }

    @Roles(Rol.admin, Rol.staff)
    @Get('movements')
    movements(@Query('idIngredient') idIngredient?: string) {
        return this.service.listMovements(idIngredient ? Number(idIngredient) : undefined);
    }

    @Roles(Rol.admin, Rol.staff)
    @Post('entries')
    entry(@Body() dto: RegisterEntryDto, @UsuarioActual() usuario: PayloadJwt) {
        return this.service.registerEntry(dto, usuario.correo);
    }

    // RN-25 a RN-28: consumo por pedido. Se expone como caso de uso
    // independiente para que otros módulos puedan invocarlo.
    @Roles(Rol.admin, Rol.staff)
    @Post('consume')
    consume(@Body() dto: MoveStockDto, @UsuarioActual() usuario: PayloadJwt) {
        return this.service.consume(dto, usuario.correo);
    }

    @Roles(Rol.admin, Rol.staff)
    @Post('return')
    returnStock(@Body() dto: MoveStockDto, @UsuarioActual() usuario: PayloadJwt) {
        return this.service.returnStock(dto, usuario.correo);
    }

    // RN-47/RN-49: mínimos, mermas y ajustes son decisiones de la dueña.
    @Roles(Rol.admin)
    @Patch(':id/min-stock')
    setMinStock(@Param('id', ParseIntPipe) id: number, @Body() dto: SetMinStockDto) {
        return this.service.setMinStock(id, dto);
    }

    @Roles(Rol.admin)
    @Post('waste')
    registerWaste(@Body() dto: RegisterWasteDto, @UsuarioActual() usuario: PayloadJwt) {
        return this.service.registerWaste(dto, usuario.correo);
    }

    @Roles(Rol.admin)
    @Post('adjustments')
    adjustStock(@Body() dto: AdjustStockDto, @UsuarioActual() usuario: PayloadJwt) {
        return this.service.adjustStock(dto, usuario.correo);
    }
}
