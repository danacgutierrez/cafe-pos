import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { CLIENT_REPOSITORY } from './clients.tokens';
import { PrismaProductRepository } from 'src/productos/infra/product-prisma.repository';

@Module({
  controllers: [ClientsController],
  providers: [
    ClientsService,
    {
      provide: CLIENT_REPOSITORY,
      useClass: PrismaProductRepository,
    },
  ],
})
export class ClientsModule {}