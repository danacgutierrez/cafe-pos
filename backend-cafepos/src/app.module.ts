import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PeticionIdMiddleware } from './comun/middleware/peticion-id.middleware';
import { OrdersModule } from './ordenes/orders.module';
import { ProductsModule } from './productos/products.module';
import { ClientsModule } from './clientes/clients.module';
import { PrismaModule } from './prisma/prisma.module';
import { MenuModule } from './menu/modulo/menu.module';
import { InventoryModule } from './inventario/modulo/inventory.module';
import { PaymentsModule } from './pagos/modulo/payments.module';
import { RewardsModule } from './recompensas/modulo/rewards.module';
import { StatusModule } from './estados/modulo/status.module';

@Module({
  imports: [
    AuthModule,
    OrdersModule,
    ProductsModule,
    ClientsModule,
    MenuModule,
    InventoryModule,
    PaymentsModule,
    RewardsModule,
    StatusModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
// Un middleware no va en providers: se registra en configure().
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PeticionIdMiddleware)
      .forRoutes('*');
  }
}
