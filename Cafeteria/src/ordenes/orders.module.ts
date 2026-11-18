import { Module } from '@nestjs/common';
import { MenuModule } from '../menu/modulo/menu.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ORDER_REPOSITORY } from './orders.tokens';
import { PrismaOrderRepository } from './infra/order-prisma.repository';

@Module({
  imports: [MenuModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    {
      provide: ORDER_REPOSITORY,
      useClass: PrismaOrderRepository,
    },
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
