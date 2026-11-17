import { Module } from '@nestjs/common';
import { OrdersModule } from '../../ordenes/orders.module';
import { STATUS_REPOSITORY } from '../dominio/status.repository';
import { PrismaStatusRepository } from '../infra/status-prisma.repository';
import { StatusController } from '../controlador/status.controller';
import { StatusService } from '../servicio/status.service';

@Module({
  imports: [OrdersModule],
  controllers: [StatusController],
  providers: [
    StatusService,
    { provide: STATUS_REPOSITORY, useClass: PrismaStatusRepository },
  ],
  exports: [StatusService],
})
export class StatusModule {}
