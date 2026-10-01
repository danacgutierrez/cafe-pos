/** How clients earn points. */
export type EarnMode = "per_visit" | "per_amount";

/** How clients redeem their points. */
export type RedeemMode = "free_item" | "account_balance";

/** The configuration of the loyalty program that rewards clients for their purchases. */
export interface LoyaltyProgram {
  /** Unique identifier of the program. */
  readonly id: string;

  /** Display name of the program. */
  name: string;

  /** Date and time the program was last modified. */
  updatedAt: Date;

  /** Whether the program is currently running. Inactive programs do not grant points. */
  isActive: boolean;

  /** How points are earned: a fixed amount per order or proportionally to the amount spent. */
  earnMode: EarnMode;

  /**
   * Points granted according to `earnMode`: per order, or per unit of currency spent.
   */
  earnValue: number;

  /** How points are redeemed: for a free item or as a account balance. */
  redeemMode: RedeemMode;

  /** Points required to get one reward when `redeemMode` is `"free_item"`. */
  pointsPerReward: number;

  /** Monetary value of a single point when `redeemMode` is `account_balance`. */
  pointValue?: number;
}