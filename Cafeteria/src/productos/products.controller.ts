import {
  Controller,
  Get,
} from '@nestjs/common';
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