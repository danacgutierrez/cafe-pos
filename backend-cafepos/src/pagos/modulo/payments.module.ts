import { Module } from '@nestjs/common';
import { PAYMENT_REPOSITORY } from '../dominio/payment.repository';
import { PrismaPaymentRepository } from '../infra/payment-prisma.repository';
import { PaymentsController } from '../controlador/payments.controller';
import { PaymentsService } from '../servicio/payments.service';

@Module({
    controllers: [PaymentsController],
    providers: [
        PaymentsService,
        { provide: PAYMENT_REPOSITORY, useClass: PrismaPaymentRepository },
    ],
    exports: [PaymentsService],
})
export class PaymentsModule {}
