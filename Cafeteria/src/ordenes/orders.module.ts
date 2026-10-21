import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ORDER_REPOSITORY } from './orders.tokens';
import { PrismaOrderRepository } from './infra/order-prisma.repository';

@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    {
      provide: ORDER_REPOSITORY,
      useClass: PrismaOrderRepository,
    },
  ],
})
export class OrdersModule {}
