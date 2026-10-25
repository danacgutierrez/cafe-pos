/** How clients earn: a fixed number of points per visit, or a percentage of what they pay. */
export type EarnMode = "per_visit" | "per_amount";

/** How clients redeem: a free item, or balance they spend like money. */
export type RedeemMode = "free_item" | "account_balance";

/** What the client's loyaltyBalance counts under a program. */
export type BalanceUnit = "points" | "cents";

export interface BaseProgram {
    readonly id: string;
    /** Unique among programs, ignoring case. */
    name: string;
    updatedAt: Date;
    /** Only one program is active at a time; inactive ones are kept because past transactions point to them. */
    isActive: boolean;
}

/** Points per visit; a free item once the client has `pointsPerReward` points. */
export interface VisitRule {
    earnMode: "per_visit";
    redeemMode: "free_item";
    /** Points granted per visit (a whole number). */
    earnValue: number;
    pointsPerReward: number;
}

/** A percentage of the money really paid becomes balance, in cents, that the client can spend. */
export interface WalletRule {
    earnMode: "per_amount";
    redeemMode: "account_balance";
    /** Whole percentage of the amount paid: 5 means 5%. */
    earnValue: number;
}

export type ProgramRule = VisitRule | WalletRule;

export type VisitProgram = BaseProgram & VisitRule;
export type WalletProgram = BaseProgram & WalletRule;
export type LoyaltyProgram = VisitProgram | WalletProgram;