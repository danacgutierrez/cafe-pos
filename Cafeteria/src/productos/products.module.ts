import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PRODUCT_REPOSITORY } from './products.tokens';
import { InMemoryProductRepository } from './infra/InMemoryProductRepository';
import { PrismaProductRepository } from './infra/product-prisma.repository';

@Module({
  controllers: [ProductsController],
  providers: [
    ProductsService,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: PrismaProductRepository,
    },
  ],
})
export class ProductsModule {}