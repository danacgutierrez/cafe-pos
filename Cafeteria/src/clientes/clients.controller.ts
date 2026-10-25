import {
  Controller,
  Get,
} from '@nestjs/common';
import { Rol, type PayloadJwt } from '../auth/dominio/usuario';
import { Roles } from 'src/auth/decoradores/roles.decorator';
import { ClientsService } from './clients.service';
import { toClientDto } from './dto/client-response.dto';

@Controller('clients')
export class ClientsController {
    constructor(private readonly service: ClientsService) {}

    @Roles(Rol.admin)
    @Get()
    async findAll() {
        const lista = await this.service.findAll();
        return lista.map(toClientDto);
    }
}