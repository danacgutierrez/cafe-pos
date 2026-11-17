import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { CLIENT_REPOSITORY } from './clients.tokens';
import { PrismaClientRepository } from './infra/client-prisma.repository';

@Module({
  controllers: [ClientsController],
  providers: [
    ClientsService,
    {
      provide: CLIENT_REPOSITORY,
      useClass: PrismaClientRepository,
    },
  ],
})
export class ClientsModule {}
