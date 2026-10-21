// De la Practica 9B (Paso 2.2): se importan MiddlewareConsumer y NestModule.
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
//import { PrismaModule } from './prisma/prisma.module';
// NUEVO (Practica 10, Paso 3): el modulo de autenticacion
import { AuthModule } from './auth/auth.module';
// De la Practica 9B: el middleware
import { PeticionIdMiddleware } from './comun/middleware/peticion-id.middleware';
import { OrdersModule } from './ordenes/orders.module';
import { ProductsModule } from './productos/products.module';
import { ClientsModule } from './clientes/clients.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    AuthModule, // NUEVO (Paso 3): registro, login y la estrategia JWT
    OrdersModule,
    ProductsModule,
    ClientsModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
// De la Practica 9B (Paso 2.2): un middleware NO va en providers. Se registra
// implementando NestModule y su metodo configure().
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PeticionIdMiddleware) // que middleware
      .forRoutes('*');             // en que rutas: '*' = todas
  }
}
