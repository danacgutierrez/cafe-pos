import { Module } from '@nestjs/common';
import { MENU_REPOSITORY } from '../dominio/menu.repository';
import { PrismaMenuRepository } from '../infra/menu-prisma.repository';
import { MenuController } from '../controlador/menu.controller';
import { MenuService } from '../servicio/menu.service';

@Module({
    controllers: [MenuController],
    providers: [
        MenuService,
        { provide: MENU_REPOSITORY, useClass: PrismaMenuRepository },
    ],
    exports: [MenuService],
})
export class MenuModule {}
