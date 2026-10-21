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