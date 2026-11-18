import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Roles } from '../../auth/decoradores/roles.decorator';
import { UsuarioActual } from '../../auth/decoradores/usuario-actual.decorator';
import { Rol, type PayloadJwt } from '../../auth/dominio/usuario';
import { RewardsService } from '../servicio/rewards.service';
import {
    AdjustPointsDto,
    ConfigureProgramDto,
    EarnDto,
    RedeemDto,
    ReverseDto,
} from '../dto/rewards.dto';

@Controller('rewards')
export class RewardsController {
    constructor(private readonly service: RewardsService) {}

    @Roles(Rol.admin)
    @Get('programs')
    listPrograms() {
        return this.service.listPrograms();
    }

    @Roles(Rol.admin)
    @Post('programs')
    configure(@Body() dto: ConfigureProgramDto) {
        return this.service.configureProgram(dto);
    }

    @Roles(Rol.admin)
    @Get('movements')
    allMovements(@UsuarioActual() usuario: PayloadJwt) {
        return this.service.movements(undefined, usuario);
    }

    @Get('clients/:idClient/points')
    points(
        @Param('idClient', ParseIntPipe) idClient: number,
        @UsuarioActual() usuario: PayloadJwt,
    ) {
        return this.service.myPoints(idClient, usuario);
    }

    @Get('clients/:idClient/movements')
    clientMovements(
        @Param('idClient', ParseIntPipe) idClient: number,
        @UsuarioActual() usuario: PayloadJwt,
    ) {
        return this.service.movements(idClient, usuario);
    }

    @Post('redemption-plan')
    @HttpCode(200) // es una vista previa; no descuenta puntos
    redeemPlan(@Body() dto: RedeemDto, @UsuarioActual() usuario: PayloadJwt) {
        if (!usuario.idClient) {
            return this.service.planRedeem(0, dto, usuario);
        }
        return this.service.planRedeem(usuario.idClient, dto, usuario);
    }

    @Roles(Rol.admin)
    @Post('earn')
    earn(@Body() dto: EarnDto, @UsuarioActual() usuario: PayloadJwt) {
        return this.service.earn(dto, usuario);
    }

    @Roles(Rol.admin)
    @Post('reverse')
    reverse(@Body() dto: ReverseDto, @UsuarioActual() usuario: PayloadJwt) {
        return this.service.reverse(dto, usuario);
    }

    @Roles(Rol.admin)
    @Post('adjust')
    adjust(@Body() dto: AdjustPointsDto, @UsuarioActual() usuario: PayloadJwt) {
        return this.service.adjust(dto, usuario);
    }
}
