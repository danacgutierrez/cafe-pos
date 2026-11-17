import { EarnMode, RedeemMode, TransactionType } from '../../ordenes/dominio/entidades';

// Reutiliza la tabla loyalty_programs: la implementación de recompensas
// que ya tiene OrdersService escribe ahí mismo sus movimientos.
export class RewardProgram {
    id!: number;
    name!: string;
    isActive!: boolean;
    earnMode!: EarnMode;
    earnValue!: number;
    redeemMode!: RedeemMode;
    pointsPerReward!: number;
    pointValue!: number;
}

export class PointsMovement {
    id!: number;
    idClient!: number;
    idLoyaltyProgram!: number;
    idOrder?: number | null;
    transactionType!: TransactionType;
    pointsEarned!: number;
    balanceAfter!: number;
    reason?: string | null;
    responsible?: string | null;
    createdAt!: Date;
}

export interface DatosMovimiento {
    idClient: number;
    idLoyaltyProgram: number;
    idOrder?: number;
    transactionType: TransactionType;
    pointsEarned: number;
    reason?: string;
    responsible?: string;
}

export interface DatosPrograma {
    name: string;
    earnMode: EarnMode;
    earnValue: number;
    redeemMode: RedeemMode;
    pointsPerReward: number;
    pointValue: number;
}

export interface PlanRecompensa {
    puntosADescontar: number;
    saldoNuevo: number;
    programa: RewardProgram;
}
