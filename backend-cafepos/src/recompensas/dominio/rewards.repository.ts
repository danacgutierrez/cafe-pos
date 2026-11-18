import { DatosMovimiento, DatosPrograma, PointsMovement, RewardProgram } from './entidades';

export interface PedidoParaRecompensa {
    id: number;
    idClient: number;
    total: number;
    status: string;
}

export interface RewardsRepository {
    findOrder(idOrder: number): Promise<PedidoParaRecompensa | null>;
    findActiveProgram(): Promise<RewardProgram | null>;
    findAllPrograms(): Promise<RewardProgram[]>;
    replaceActiveProgram(datos: DatosPrograma): Promise<RewardProgram>;

    findBalance(idClient: number): Promise<number>;
    findMovements(idClient?: number): Promise<PointsMovement[]>;
    findMovementsByOrder(idOrder: number): Promise<PointsMovement[]>;

    // Movimiento + saldo en la misma transacción (RN-39).
    applyMovement(datos: DatosMovimiento): Promise<PointsMovement>;
}

export const REWARDS_REPOSITORY = 'REWARDS_REPOSITORY';
