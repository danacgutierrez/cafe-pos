import {
    Body,
    Controller,
    Get,
    Patch,
} from '@nestjs/common';
import { Rol, type PayloadJwt } from '../auth/dominio/usuario';
import { Roles } from '../auth/decoradores/roles.decorator';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator';
import { ClientsService } from './clients.service';
import { toClientDto } from './dto/client-response.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';

@Controller('clients')
export class ClientsController {
    constructor(private readonly service: ClientsService) {}

    @Roles(Rol.admin)
    @Get()
    async findAll() {
        const lista = await this.service.findAll();
        return lista.map(toClientDto);
    }

    // Rutas del cliente sobre su propio perfil: el idClient sale del JWT,
    // nunca del cuerpo ni de la URL (RN-46).
    @Get('me')
    async findMio(@UsuarioActual() usuario: PayloadJwt) {
        return toClientDto(await this.service.findMio(usuario.idClient));
    }

    @Patch('me')
    async actualizarMio(
        @UsuarioActual() usuario: PayloadJwt,
        @Body() datos: ActualizarClienteDto,
    ) {
        return toClientDto(await this.service.actualizar(usuario.idClient, datos));
    }
}
