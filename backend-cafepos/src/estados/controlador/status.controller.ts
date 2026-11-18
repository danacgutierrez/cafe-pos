import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Roles } from '../../auth/decoradores/roles.decorator';
import { UsuarioActual } from '../../auth/decoradores/usuario-actual.decorator';
import { Rol, type PayloadJwt } from '../../auth/dominio/usuario';
import { ChangeStatusDto } from '../dto/status.dto';
import { StatusService } from '../servicio/status.service';

@Controller('orders')
export class StatusController {
  constructor(private readonly service: StatusService) {}

  // RN-16: el cliente consulta el estado sin preguntar por WhatsApp.
  @Get(':id/status')
  current(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: PayloadJwt) {
    return this.service.currentStatus(id, usuario);
  }

  @Roles(Rol.staff, Rol.admin)
  @Patch(':id/status')
  change(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatusDto,
    @UsuarioActual() usuario: PayloadJwt,
  ) {
    return this.service.changeStatus(id, dto, usuario);
  }

  @Post(':id/repeat')
  @HttpCode(200) // solo calcula la repetición; no crea el pedido
  repeat(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: PayloadJwt) {
    return this.service.repeatOrder(id, usuario);
  }
}
