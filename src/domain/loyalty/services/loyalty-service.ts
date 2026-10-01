import { randomUUID } from "node:crypto";
import { LoyaltyRepository } from "../ports/loyalty-repository.js";
import { EarnMode, LoyaltyProgram, RedeemMode } from "../entities/loyalty-program.entity.js";
import { LoyaltyTransaction, TransactionType } from "../entities/loyalty-transaction.entity.js";
import type { OrderStatus } from "../../order/entities/order.entity.js";
import { NoActiveProgramError } from "../errors/no-active-program-error.js";
import { OrderNotEligibleForPointsError } from "../errors/order-not-eligible-for-points-error.js";
import { InsufficientPointsError } from "../errors/insufficient-points-error.js";
import { MultipleRewardsPerOrderError } from "../errors/multiple-rewards-per-order-error.js";
import { BalanceExceedsOrderTotalError } from "../errors/balance-exceeds-order-total-error.js";
import { MissingAdjustmentInfoError } from "../errors/missing-adjustment-info-error.js";

/** Data required to create a loyalty program. New programs start inactive. */
export interface CreateProgramInput {
  /** Display name of the program. */
  name: string;
  /** How rewards are earned. */
  earnMode: EarnMode;
  /**
   * Amount earned according to `earnMode`: points per visit, or the
   * percentage of the amount paid that becomes balance (5 means 5%).
   */
  earnValue: number;
  /** How rewards are redeemed. */
  redeemMode: RedeemMode;
  /** Points needed for one reward. Only used when `redeemMode` is `"free_item"`. */
  pointsPerReward: number;
}

/** Data required to grant the reward an order earns. */
export interface EarnForOrderInput {
  /** Identifier of the order that originates the reward. */
  orderId: string;
  /** Identifier of the client who placed the order. */
  clientId: string;
  /** Current status of the order. */
  orderStatus: OrderStatus;
  /**
   * Amount really paid with money. Anything paid with points or balance
   * must be excluded by the caller.
   */
  amountPaid: number;
}

/** Data required to redeem a free item. */
export interface RedeemRewardInput {
  /** Identifier of the client redeeming the reward. */
  clientId: string;
  /** Identifier of the order in which the reward is used. */
  orderId: string;
  /** Number of rewards requested in the order. Defaults to 1. */
  rewardsRequested?: number;
}

/** Data required to use account balance in an order. */
export interface RedeemBalanceInput {
  /** Identifier of the client using the balance. */
  clientId: string;
  /** Identifier of the order in which the balance is used. */
  orderId: string;
  /** Amount of balance to apply. */
  amount: number;
  /** Total of the order, which the applied balance cannot exceed. */
  orderTotal: number;
}

/** Data required to register a manual correction. */
export interface AdjustmentInput {
  /** Identifier of the client whose balance is corrected. */
  clientId: string;
  /** Amount to add (positive) or remove (negative). */
  amount: number;
  /** Why the correction is made. */
  reason: string;
  /** Identifier of the user responsible for the correction. */
  changedById: string;
}

/** What a client sees about their progress in the active program. */
export interface RewardProgress {
  /** Current balance of the client. */
  balance: number;
  /** Rewards the client could redeem right now. Always 0 for balance programs. */
  rewardsAvailable: number;
  /** Points missing for the next reward. `null` for balance programs. */
  pointsToNextReward: number | null;
}

/**
 * Application service that handles the loyalty program: program
 * configuration, earning, redeeming, refunds and adjustments.
 */
export class LoyaltyService {
  /**
   * @param loyalty - Persistence port for loyalty programs and their transactions.
   */
  constructor(private readonly loyalty: LoyaltyRepository) {}

  /**
   * Creates a program in the inactive state. Use {@link activateProgram}
   * to start it.
   *
   * @param input - Configuration of the program.
   * @returns The persisted program.
   */
  async createProgram(input: CreateProgramInput): Promise<LoyaltyProgram> {
    const program: LoyaltyProgram = {
      id: randomUUID(),
      name: input.name,
      updatedAt: new Date(),
      isActive: false,
      earnMode: input.earnMode,
      earnValue: input.earnValue,
      redeemMode: input.redeemMode,
      pointsPerReward: input.pointsPerReward,
    };

    return this.loyalty.save(program);
  }

  /**
   * Activates a program and deactivates the previous one, which is kept
   * because past transactions reference it.
   *
   * @param programId - Identifier of the program to activate.
   * @throws {Error} If the program doesn't exist.
   */
  async activateProgram(programId: string): Promise<void> {
    await this.getExistingProgram(programId);
    await this.loyalty.activate(programId);
  }

  /**
   * Changes the configuration of a program. Balances already earned are
   * not modified; only future earnings and redemptions use the new values.
   *
   * @param programId - Identifier of the program.
   * @param changes - Configuration values to change.
   * @returns The updated program.
   * @throws {Error} If the program doesn't exist.
   */
  async updateProgram(
    programId: string,
    changes: Partial<CreateProgramInput>,
  ): Promise<LoyaltyProgram> {
    const program = await this.getExistingProgram(programId);

    return this.loyalty.save({ ...program, ...changes, updatedAt: new Date() });
  }

  /**
   * Grants the points or balance a delivered order earns.
   *
   * Delivering an order never fails because of loyalty: `null` is returned,
   * and nothing is granted, when there is no active program, when nothing
   * was paid with money, when the order already earned, when a per-visit
   * client already earned today, or when the calculated amount is zero.
   *
   * @param input - Order data.
   * @returns The recorded transaction, or `null` if nothing was granted.
   * @throws {OrderNotEligibleForPointsError} If the order is not delivered.
   */
  async earnForOrder(input: EarnForOrderInput): Promise<LoyaltyTransaction | null> {
    if (input.orderStatus !== "delivered") {
      throw new OrderNotEligibleForPointsError(input.orderId, input.orderStatus);
    }

    const program = await this.loyalty.findActive();
    if (!program || input.amountPaid <= 0) {
      return null;
    }

    const orderTransactions = await this.loyalty.findByOrder(input.orderId);
    if (orderTransactions.some((t) => t.transactionType === "earn")) {
      return null;
    }

    let amount: number;
    if (program.earnMode === "per_visit") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const earnedToday = await this.loyalty.findEarnByClientInRange(
        input.clientId,
        startOfDay,
        endOfDay,
      );
      if (earnedToday) {
        return null;
      }

      amount = program.earnValue;
    } else {
      // Percentage of what was really paid, rounded to cents.
      amount = Math.round(input.amountPaid * program.earnValue) / 100;
    }

    if (amount <= 0) {
      return null;
    }

    return this.recordTransaction(program.id, input.clientId, amount, "earn", {
      orderId: input.orderId,
    });
  }

  /**
   * Redeems one free item, deducting the points the program requires.
   * Meant to be called when the order is confirmed.
   *
   * @param input - Redemption data.
   * @returns The recorded transaction.
   * @throws {MultipleRewardsPerOrderError} If more than one reward is used in the order.
   * @throws {NoActiveProgramError} If there is no active program.
   * @throws {InsufficientPointsError} If the client doesn't have enough points.
   * @throws {Error} If the active program doesn't give free items.
   */
  async redeemReward(input: RedeemRewardInput): Promise<LoyaltyTransaction> {
    const requested = input.rewardsRequested ?? 1;
    if (requested > 1) {
      throw new MultipleRewardsPerOrderError(requested);
    }

    const program = await this.getActiveProgram();
    if (program.redeemMode !== "free_item") {
      throw new Error(`Program ${program.id} doesn't give free items`);
    }

    const orderTransactions = await this.loyalty.findByOrder(input.orderId);
    const alreadyRedeemed = orderTransactions.some(
      (t) => t.transactionType === "redeem" && !this.isRefunded(t, orderTransactions),
    );
    if (alreadyRedeemed) {
      throw new MultipleRewardsPerOrderError(2);
    }

    const balance = await this.loyalty.getBalance(input.clientId);
    if (balance < program.pointsPerReward) {
      throw new InsufficientPointsError(input.clientId, program.pointsPerReward, balance);
    }

    return this.recordTransaction(program.id, input.clientId, -program.pointsPerReward, "redeem", {
      orderId: input.orderId,
    });
  }

  /**
   * Uses account balance to pay part of an order.
   * Meant to be called when the order is confirmed.
   *
   * @param input - Redemption data.
   * @returns The recorded transaction.
   * @throws {NoActiveProgramError} If there is no active program.
   * @throws {BalanceExceedsOrderTotalError} If the amount is higher than the order total.
   * @throws {InsufficientPointsError} If the client doesn't have enough balance.
   * @throws {Error} If the amount is not positive or the program doesn't use balance.
   */
  async redeemBalance(input: RedeemBalanceInput): Promise<LoyaltyTransaction> {
    if (input.amount <= 0) {
      throw new Error(`Amount to redeem must be positive, received ${input.amount}`);
    }

    const program = await this.getActiveProgram();
    if (program.redeemMode !== "account_balance") {
      throw new Error(`Program ${program.id} doesn't use account balance`);
    }

    if (input.amount > input.orderTotal) {
      throw new BalanceExceedsOrderTotalError(input.amount, input.orderTotal);
    }

    const balance = await this.loyalty.getBalance(input.clientId);
    if (balance < input.amount) {
      throw new InsufficientPointsError(input.clientId, input.amount, balance);
    }

    return this.recordTransaction(program.id, input.clientId, -input.amount, "redeem", {
      orderId: input.orderId,
    });
  }

  /**
   * Returns the points or balance redeemed in an order that was cancelled.
   * Redemptions that were already returned are skipped, so calling this
   * more than once is safe.
   *
   * @param orderId - Identifier of the cancelled order.
   * @returns The refund transactions that were recorded.
   */
  async refundOrder(orderId: string): Promise<LoyaltyTransaction[]> {
    const orderTransactions = await this.loyalty.findByOrder(orderId);
    const pending = orderTransactions.filter(
      (t) => t.transactionType === "redeem" && !this.isRefunded(t, orderTransactions),
    );

    const refunds: LoyaltyTransaction[] = [];
    for (const original of pending) {
      refunds.push(
        await this.recordTransaction(
          original.loyaltyProgramId,
          original.clientId,
          -original.amount,
          "refund",
          { orderId, refundedTransactionId: original.id },
        ),
      );
    }

    return refunds;
  }

  /**
   * Registers a manual correction. Transactions are never edited or
   * deleted; every correction is a new adjustment with its reason and
   * the person responsible.
   *
   * @param input - Adjustment data.
   * @returns The recorded transaction.
   * @throws {MissingAdjustmentInfoError} If the reason or the responsible user is missing.
   * @throws {NoActiveProgramError} If there is no active program.
   * @throws {InsufficientPointsError} If the adjustment would leave a negative balance.
   */
  async adjustBalance(input: AdjustmentInput): Promise<LoyaltyTransaction> {
    const missing: string[] = [];
    if (!input.reason?.trim()) missing.push("reason");
    if (!input.changedById?.trim()) missing.push("changedById");
    if (missing.length > 0) {
      throw new MissingAdjustmentInfoError(missing);
    }

    const program = await this.getActiveProgram();

    const balance = await this.loyalty.getBalance(input.clientId);
    if (balance + input.amount < 0) {
      throw new InsufficientPointsError(input.clientId, -input.amount, balance);
    }

    return this.recordTransaction(program.id, input.clientId, input.amount, "adjustment", {
      reason: input.reason.trim(),
      changedById: input.changedById,
    });
  }

  /**
   * Gets the current balance of a client.
   *
   * @param clientId - Identifier of the client.
   */
  async getBalance(clientId: string): Promise<number> {
    return this.loyalty.getBalance(clientId);
  }

  /**
   * Gets the progress of a client towards the next reward.
   *
   * @param clientId - Identifier of the client.
   * @throws {NoActiveProgramError} If there is no active program.
   */
  async getProgress(clientId: string): Promise<RewardProgress> {
    const program = await this.getActiveProgram();
    const balance = await this.loyalty.getBalance(clientId);

    if (program.redeemMode !== "free_item") {
      return { balance, rewardsAvailable: 0, pointsToNextReward: null };
    }

    const rewardsAvailable = Math.floor(balance / program.pointsPerReward);
    const pointsToNextReward = program.pointsPerReward - (balance % program.pointsPerReward);

    return { balance, rewardsAvailable, pointsToNextReward };
  }

  /**
   * Lists the transaction history of a client, newest first.
   *
   * @param clientId - Identifier of the client.
   */
  async listHistory(clientId: string): Promise<LoyaltyTransaction[]> {
    return this.loyalty.findByClient(clientId);
  }

  /**
   * Loads the active program or fails if there is none.
   *
   * @throws {NoActiveProgramError} If there is no active program.
   */
  private async getActiveProgram(): Promise<LoyaltyProgram> {
    const program = await this.loyalty.findActive();
    if (!program) {
      throw new NoActiveProgramError();
    }
    return program;
  }

  /**
   * Loads a program by id or fails if it doesn't exist.
   *
   * @throws {Error} If the program doesn't exist.
   */
  private async getExistingProgram(programId: string): Promise<LoyaltyProgram> {
    const program = await this.loyalty.findById(programId);
    if (!program) {
      throw new Error(`Loyalty program ${programId} doesn't exist`);
    }
    return program;
  }

  /** Tells whether a refund that points to `transaction` exists in `all`. */
  private isRefunded(transaction: LoyaltyTransaction, all: LoyaltyTransaction[]): boolean {
    return all.some(
      (t) => t.transactionType === "refund" && t.refundedTransactionId === transaction.id,
    );
  }

  /** Builds and records a transaction, computing the balance after it. */
  private async recordTransaction(
    programId: string,
    clientId: string,
    amount: number,
    type: TransactionType,
    extra: Partial<
      Pick<LoyaltyTransaction, "orderId" | "reason" | "changedById" | "refundedTransactionId">
    > = {},
  ): Promise<LoyaltyTransaction> {
    const balance = await this.loyalty.getBalance(clientId);

    return this.loyalty.record({
      id: randomUUID(),
      loyaltyProgramId: programId,
      clientId,
      amount,
      balanceAfter: balance + amount,
      transactionType: type,
      createdAt: new Date(),
      ...extra,
    });
  }
}