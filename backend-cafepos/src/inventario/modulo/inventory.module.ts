import { Module } from '@nestjs/common';
import { INVENTORY_REPOSITORY } from '../dominio/inventory.repository';
import { PrismaInventoryRepository } from '../infra/inventory-prisma.repository';
import { InventoryController } from '../controlador/inventory.controller';
import { InventoryService } from '../servicio/inventory.service';

@Module({
    controllers: [InventoryController],
    providers: [
        InventoryService,
        { provide: INVENTORY_REPOSITORY, useClass: PrismaInventoryRepository },
    ],
    exports: [InventoryService],
})
export class InventoryModule {}
