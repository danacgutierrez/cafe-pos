import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Rol, type PayloadJwt } from '../../auth/dominio/usuario';
import { EarnMode, TransactionType } from '../../ordenes/dominio/entidades';
import {
    InsufficientPointsError,
    InvalidPointsToEarn,
    NoActiveLoyaltyProgramError,
    NonOrderFoundError,
} from '../../ordenes/dominio/errores';
import { PointsMovement } from '../dominio/entidades';
import {
    AlreadyReversedError,
    InvalidAdjustmentValueError,
    MissingPointsReasonError,
    MultipleFreeDrinksError,
} from '../dominio/errores';
import { REWARDS_REPOSITORY, type RewardsRepository } from '../dominio/rewards.repository';
import type { MyPointsResponseDto, RedeemPlanResponseDto } from '../dto/rewards-response.dto';
import {
    AdjustPointsDto,
    ConfigureProgramDto,
    EarnDto,
    RedeemDto,
    ReverseDto,
} from '../dto/rewards.dto';

@Injectable()
export class RewardsService {
    constructor(@Inject(REWARDS_REPOSITORY) private readonly repo: RewardsRepository) {}

    // RN-35: activar uno nuevo desactiva el anterior sin borrarlo.
    configureProgram(dto: ConfigureProgramDto) {
        return this.repo.replaceActiveProgram({
            name: dto.name,
            earnMode: dto.earnMode,
            earnValue: dto.earnValue,
            redeemMode: dto.redeemMode,
            pointsPerReward: dto.pointsPerReward,
            pointValue: dto.pointValue,
        });
    }

    listPrograms() {
        return this.repo.findAllPrograms();
    }

    async myPoints(idClient: number, usuario: PayloadJwt): Promise<MyPointsResponseDto> {
        this.verificarAcceso(idClient, usuario);
        return this.calcularPuntos(idClient);
    }

    async movements(idClient: number | undefined, usuario: PayloadJwt) {
        if (idClient === undefined) {
            this.soloAdmin(usuario);
            return await this.repo.findMovements();
        }

        this.verificarAcceso(idClient, usuario);
        return await this.repo.findMovements(idClient);
    }

    // RN-38/RN-39/RN-40: el canje lo decide el cliente y solo se calcula.
    // El descuento real sigue ocurriendo en OrdersService al confirmar.
    async planRedeem(
        idClient: number,
        dto: RedeemDto,
        usuario: PayloadJwt,
    ): Promise<RedeemPlanResponseDto> {
        this.verificarAcceso(idClient, usuario);

        const programa = await this.repo.findActiveProgram();
        if (!programa) {
            throw new NoActiveLoyaltyProgramError();
        }

        const saldo = await this.repo.findBalance(idClient);
        if (saldo < programa.pointsPerReward) {
            throw new InsufficientPointsError();
        }

        if (dto.idOrder) {
            const movimientos = await this.repo.findMovementsByOrder(dto.idOrder);
            if (movimientos.some((m) => m.transactionType === TransactionType.REDEEM)) {
                throw new MultipleFreeDrinksError();
            }
        }

        return {
            programa,
            puntosADescontar: programa.pointsPerReward,
            saldoNuevo: saldo - programa.pointsPerReward,
        };
    }

    // RN-37/RN-41: puntos solo al entregar/pagar, calculados sobre lo pagado.
    // Si OrdersService ya registro el EARN, se devuelve ese movimiento.
    async earn(dto: EarnDto, usuario: PayloadJwt): Promise<PointsMovement> {
        this.soloAdmin(usuario);

        let idClient = dto.idClient;
        let eligibleAmount = dto.eligibleAmount ?? 0;

        if (dto.idOrder) {
            const pedido = await this.repo.findOrder(dto.idOrder);
            if (!pedido) {
                throw new NonOrderFoundError();
            }

            idClient = pedido.idClient;
            eligibleAmount = dto.eligibleAmount ?? pedido.total;

            const anteriores = await this.repo.findMovementsByOrder(dto.idOrder);
            const yaGanado = anteriores.find((m) => m.transactionType === TransactionType.EARN);
            if (yaGanado) {
                return yaGanado;
            }
        }

        const programa = await this.repo.findActiveProgram();
        if (!programa) {
            throw new NoActiveLoyaltyProgramError();
        }

        const puntos = this.puntosPorPrograma(programa.earnMode, programa.earnValue, eligibleAmount);
        if (puntos <= 0) {
            throw new InvalidPointsToEarn();
        }

        return await this.repo.applyMovement({
            idClient,
            idLoyaltyProgram: programa.id,
            idOrder: dto.idOrder,
            transactionType: TransactionType.EARN,
            pointsEarned: puntos,
            reason: 'Puntos por pedido entregado (RN-37)',
            responsible: usuario.correo,
        });
    }

    // RN-42: cancelacion o reembolso genera un movimiento inverso.
    async reverse(dto: ReverseDto, usuario: PayloadJwt): Promise<PointsMovement> {
        this.soloAdmin(usuario);

        const pedido = await this.repo.findOrder(dto.idOrder);
        if (!pedido) {
            throw new NonOrderFoundError();
        }

        const movimientos = await this.repo.findMovementsByOrder(dto.idOrder);
        if (movimientos.some((m) => m.transactionType === TransactionType.REVERSE)) {
            throw new AlreadyReversedError();
        }

        const relevantes = movimientos.filter(
            (m) =>
                m.transactionType === TransactionType.EARN ||
                m.transactionType === TransactionType.REDEEM,
        );

        if (relevantes.length === 0) {
            throw new InvalidPointsToEarn();
        }

        const neto = relevantes.reduce((suma, m) => suma + Number(m.pointsEarned), 0);
        if (neto === 0) {
            throw new InvalidPointsToEarn();
        }

        return await this.repo.applyMovement({
            idClient: pedido.idClient,
            idLoyaltyProgram: relevantes[0].idLoyaltyProgram,
            idOrder: dto.idOrder,
            transactionType: TransactionType.REVERSE,
            pointsEarned: -neto,
            reason: dto.reason,
            responsible: usuario.correo,
        });
    }

    // RN-44: los movimientos no se borran; la correccion es uno nuevo.
    async adjust(dto: AdjustPointsDto, usuario: PayloadJwt): Promise<PointsMovement> {
        this.soloAdmin(usuario);

        if (!dto.reason || !dto.responsible) {
            throw new MissingPointsReasonError();
        }

        if (dto.points === 0) {
            throw new InvalidAdjustmentValueError();
        }

        const programa = await this.repo.findActiveProgram();
        if (!programa) {
            throw new NoActiveLoyaltyProgramError();
        }

        return await this.repo.applyMovement({
            idClient: dto.idClient,
            idLoyaltyProgram: programa.id,
            transactionType: TransactionType.ADJUST,
            pointsEarned: dto.points,
            reason: dto.reason,
            responsible: dto.responsible,
        });
    }

    private puntosPorPrograma(modo: EarnMode, valor: number, eligibleAmount: number): number {
        const puntos = modo === EarnMode.PER_ORDER ? valor : eligibleAmount * valor;
        return Math.round(puntos * 100) / 100;
    }

    private async calcularPuntos(idClient: number): Promise<MyPointsResponseDto> {
        const [balance, programa] = await Promise.all([
            this.repo.findBalance(idClient),
            this.repo.findActiveProgram(),
        ]);

        const meta = programa?.pointsPerReward ?? 0;

        return {
            balance,
            pointsPerReward: meta,
            missing: meta > balance ? Math.ceil((meta - balance) * 100) / 100 : 0,
            canRedeem: !!programa && balance >= meta,
        };
    }

    private verificarAcceso(idClient: number, usuario: PayloadJwt): void {
        // RN-46: la dueña y el personal pueden consultar puntos y movimientos
        // de cualquier cliente para atenderlo en caja.
        if (
            usuario.rol !== Rol.client &&
            usuario.rol !== Rol.staff &&
            usuario.rol !== Rol.admin
        ) {
            throw new ForbiddenException('No tienes permiso para consultar puntos');
        }

        if (usuario.rol === Rol.client && usuario.idClient !== idClient) {
            throw new ForbiddenException('Solo puedes ver tus propios puntos');
        }
    }

    private soloAdmin(usuario: PayloadJwt): void {
        if (usuario.rol !== Rol.admin) {
            throw new ForbiddenException('Solo la dueña puede administrar las recompensas');
        }
    }
}
