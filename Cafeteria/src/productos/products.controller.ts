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
import { ProductsService } from './products.service';
import { toProductDto } from './dto/product-response';
import { Publico } from 'src/auth/decoradores/publico.decorator';

@Controller('products')
export class ProductsController {
    constructor(private readonly service: ProductsService) {}

    @Publico()
    @Get()
    async findAll() {
        const lista = await this.service.findAll();
        return lista.map(toProductDto);
    }
}