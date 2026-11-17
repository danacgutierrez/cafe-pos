import { PlanRecompensa, PointsMovement, RewardProgram } from '../dominio/entidades';

export interface MyPointsResponseDto {
    balance: number;
    pointsPerReward: number;
    missing: number; // RN-45: cuántos faltan para la siguiente recompensa
    canRedeem: boolean; // RN-38: aviso, nunca canje automático
}

export type ProgramResponseDto = RewardProgram;
export type MovementResponseDto = PointsMovement;
export type RedeemPlanResponseDto = PlanRecompensa;
