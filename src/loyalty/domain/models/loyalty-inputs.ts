import { EarnMode, RedeemMode } from "../entities/loyalty-program.entity";

/** How a program works. Only two combinations are valid; the service rejects the rest. */
export interface ProgramConfig {
    earnMode: EarnMode;
    redeemMode: RedeemMode;
    /** Points per visit, or the percentage of the amount paid. */
    earnValue: number;
    /** Points needed for one free item. Only for free item programs. */
    pointsPerReward?: number;
}

export interface CreateProgramInput extends ProgramConfig {
    name: string;
}

/** The modes cannot change: to work another way, create another program. */
export interface UpdateProgramInput {
    name?: string;
    earnValue?: number;
    pointsPerReward?: number;
}

export interface ActivateProgramOptions {
    /**
     * Allows switching to a program with another unit (points <-> cents) while clients
     * still have balance: every balance is set to 0.
     */
    resetBalances?: boolean;
}

/** What every operation that touches a balance reports. The caller (Orders) keeps `amount` if it may need to refund it. */
export interface BalanceChange {
    clientId: string;
    /** Added (positive) or removed (negative). Points or cents, depending on the program. */
    amount: number;
    balanceAfter: number;
}

/**
 * There is no history here, so the caller (Orders) must call this once per delivered order,
 * and decides whether a visit counts (for example, only one per day).
 */
export interface EarnForOrderInput {
    orderId: string;
    clientId: string;
    /** Provisional: replaced by the order status when the Orders module exists. */
    isDelivered: boolean;
    /** Money really paid. Whatever was paid with points or balance must be left out by the caller. */
    amountPaidCents: number;
}

export interface RedeemRewardInput {
    clientId: string;
    /** Defaults to 1; more than 1 is rejected. */
    rewardsRequested?: number;
}

export interface RedeemBalanceInput {
    clientId: string;
    amountCents: number;
    orderTotalCents: number;
}

/** Gives back exactly what Orders had taken (the `amount` it got from the redeem, without the sign). */
export interface RefundInput {
    clientId: string;
    amount: number;
}

export interface AdjustmentInput {
    clientId: string;
    /** Added (positive) or removed (negative). */
    amount: number;
}

export interface RewardProgress {
    balance: number;
    /** Always 0 for balance programs. */
    rewardsAvailable: number;
    /** Always null for balance programs. */
    pointsToNextReward: number | null;
}