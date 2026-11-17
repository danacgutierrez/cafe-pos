import { Module } from '@nestjs/common';
import { REWARDS_REPOSITORY } from '../dominio/rewards.repository';
import { PrismaRewardsRepository } from '../infra/rewards-prisma.repository';
import { RewardsController } from '../controlador/rewards.controller';
import { RewardsService } from '../servicio/rewards.service';

@Module({
    controllers: [RewardsController],
    providers: [
        RewardsService,
        { provide: REWARDS_REPOSITORY, useClass: PrismaRewardsRepository },
    ],
    exports: [RewardsService],
})
export class RewardsModule {}
