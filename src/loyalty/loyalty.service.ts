import { randomUUID } from "crypto"
import { LoyaltyProgram } from "./domain/entities/loyalty-program.entity"
import { LoyaltyProgramRepository } from "./domain/repositories/loyalty-program.repository"
import { ClientBalanceRepository } from "./domain/repositories/client-balance.repository"
import {
    ActivateProgramOptions, AdjustmentInput, BalanceChange, CreateProgramInput, EarnForOrderInput, RedeemBalanceInput,
    RedeemRewardInput, RefundInput, RewardProgress, UpdateProgramInput,
} from "./domain/models/loyalty-inputs"
import {
    BalanceExceedsOrderTotalError, InsufficientBalanceError, MultipleRewardsPerOrderError, NoActiveProgramError,
    OrderNotEligibleForLoyaltyError, ProgramSwitchWouldMixUnitsError, RedeemModeMismatchError,
} from "./domain/errors"
import { ADJUSTMENT_MAX_ABS, PROGRAM_NAME_MAX_LENGTH } from "./domain/limits"
import { assertWholeNumber, balanceUnit, buildProgramRule } from "./domain/validation"
import { UserService } from "../user/user.service"
import { Clock } from "../shared/clock"
import { DuplicateNameError } from "../shared/duplicate-name-error"
import { normalizeText } from "../shared/normalize-text"
import { NotFoundError } from "../shared/not-found-error"

export class LoyaltyService {
    constructor(
        private readonly programs: LoyaltyProgramRepository,
        private readonly balances: ClientBalanceRepository,
        private readonly users: UserService,
        private readonly clock: Clock,
    ) { }

    /** -------------------------------------------- PROGRAMS (administrator only) -------------------------------------------- */

    /** New programs start inactive. Only two ways of working are valid (see buildProgramRule). */
    async createProgram(actorId: string, input: CreateProgramInput): Promise<LoyaltyProgram> {
        await this.users.requireAdministrator(actorId, "create loyalty programs");
        const name = normalizeText("name", input.name, PROGRAM_NAME_MAX_LENGTH);
        const rule = buildProgramRule(input);
        await this.assertNameFree(name);

        return this.programs.save({ id: randomUUID(), name, updatedAt: this.clock.now(), isActive: false, ...rule });
    }

    /** Balances already earned are untouched. The modes cannot change: create another program for that. */
    async updateProgram(actorId: string, programId: string, changes: UpdateProgramInput): Promise<LoyaltyProgram> {
        await this.users.requireAdministrator(actorId, "update loyalty programs");
        const program = await this.getProgram(programId);

        const name = changes.name === undefined ? program.name : normalizeText("name", changes.name, PROGRAM_NAME_MAX_LENGTH);
        if (changes.name !== undefined) {
            await this.assertNameFree(name, program.id);
        }
        const rule = buildProgramRule({
            earnMode: program.earnMode,
            redeemMode: program.redeemMode,
            earnValue: changes.earnValue ?? program.earnValue,
            pointsPerReward: changes.pointsPerReward ?? (program.earnMode === "per_visit" ? program.pointsPerReward : undefined),
        });

        return this.programs.save({ id: program.id, isActive: program.isActive, name, updatedAt: this.clock.now(), ...rule });
    }

    /**
     * Makes a program the only active one. Switching to a program with another unit (points <-> cents)
     * is blocked while clients have balance, unless `resetBalances` is set: then every balance goes to 0.
     */
    async activateProgram(actorId: string, programId: string, options: ActivateProgramOptions = {}): Promise<LoyaltyProgram> {
        await this.users.requireAdministrator(actorId, "activate loyalty programs");
        const program = await this.getProgram(programId);
        if (program.isActive) {
            return program;
        }

        const current = await this.programs.findActive();
        if (current && balanceUnit(current) !== balanceUnit(program)) {
            const clientsWithBalance = await this.balances.countClientsWithBalance();
            if (clientsWithBalance > 0 && !options.resetBalances) {
                throw new ProgramSwitchWouldMixUnitsError(clientsWithBalance);
            }
            await this.balances.resetAll();
        }

        await this.programs.activate(programId);
        return this.getProgram(programId);
    }

    async getProgram(programId: string): Promise<LoyaltyProgram> {
        const program = await this.programs.findById(programId);
        if (!program) {
            throw new NotFoundError("LoyaltyProgram", programId);
        }
        return program;
    }

    listPrograms(): Promise<LoyaltyProgram[]> {
        return this.programs.findAll();
    }

    /** -------------------------------------------- EARN -------------------------------------------- */

    /**
     * Grants what a delivered order earns. Loyalty never makes delivering an order fail, so `null`
     * (nothing granted) is returned when there is no active program, nothing was paid in money,
     * or the amount works out to 0.
     */
    async earnForOrder(input: EarnForOrderInput): Promise<BalanceChange | null> {
        assertWholeNumber("amountPaidCents", input.amountPaidCents, 0, Number.MAX_SAFE_INTEGER);
        if (!input.isDelivered) {
            throw new OrderNotEligibleForLoyaltyError(input.orderId);
        }
        await this.users.getClient(input.clientId);

        const program = await this.programs.findActive();
        if (!program || input.amountPaidCents === 0) {
            return null;
        }

        // never more than promised: the fraction of a cent is dropped
        const amount = program.earnMode === "per_visit"
            ? program.earnValue
            : Math.floor((input.amountPaidCents * program.earnValue) / 100);
        if (amount <= 0) {
            return null;
        }

        return this.applyChange(input.clientId, amount);
    }

    /** -------------------------------------------- REDEEM -------------------------------------------- */

    /** One free item per order, paid with the points the program asks for. */
    async redeemReward(input: RedeemRewardInput): Promise<BalanceChange> {
        const requested = input.rewardsRequested ?? 1;
        assertWholeNumber("rewardsRequested", requested, 1, Number.MAX_SAFE_INTEGER);
        if (requested > 1) {
            throw new MultipleRewardsPerOrderError(requested);
        }
        await this.users.getClient(input.clientId);

        const program = await this.getActiveProgram();
        if (program.redeemMode !== "free_item") {
            throw new RedeemModeMismatchError("free_item");
        }

        const balance = await this.balances.getBalance(input.clientId);
        if (balance < program.pointsPerReward) {
            throw new InsufficientBalanceError(input.clientId, program.pointsPerReward, balance);
        }

        return this.applyChange(input.clientId, -program.pointsPerReward);
    }

    /** Pays part of an order with balance, never more than the order total. */
    async redeemBalance(input: RedeemBalanceInput): Promise<BalanceChange> {
        assertWholeNumber("amountCents", input.amountCents, 1, Number.MAX_SAFE_INTEGER);
        assertWholeNumber("orderTotalCents", input.orderTotalCents, 1, Number.MAX_SAFE_INTEGER);
        await this.users.getClient(input.clientId);

        const program = await this.getActiveProgram();
        if (program.redeemMode !== "account_balance") {
            throw new RedeemModeMismatchError("account_balance");
        }
        if (input.amountCents > input.orderTotalCents) {
            throw new BalanceExceedsOrderTotalError(input.amountCents, input.orderTotalCents);
        }

        const balance = await this.balances.getBalance(input.clientId);
        if (balance < input.amountCents) {
            throw new InsufficientBalanceError(input.clientId, input.amountCents, balance);
        }

        return this.applyChange(input.clientId, -input.amountCents);
    }

    /**
     * Gives back what a cancelled order had redeemed. Nothing here remembers what was taken, so
     * Orders must keep the amount it got from the redeem and send exactly that, once.
     */
    async refund(input: RefundInput): Promise<BalanceChange> {
        assertWholeNumber("amount", input.amount, 1, Number.MAX_SAFE_INTEGER);
        await this.users.getClient(input.clientId);

        return this.applyChange(input.clientId, input.amount);
    }

    /** -------------------------------------------- ADJUST (administrator only) -------------------------------------------- */

    async adjustBalance(actorId: string, input: AdjustmentInput): Promise<BalanceChange> {
        await this.users.requireAdministrator(actorId, "adjust loyalty balances");
        assertWholeNumber("amount", Math.abs(input.amount), 1, ADJUSTMENT_MAX_ABS);
        await this.users.getClient(input.clientId);

        return this.applyChange(input.clientId, input.amount);
    }

    /** -------------------------------------------- READ -------------------------------------------- */

    async getBalance(clientId: string): Promise<number> {
        await this.users.getClient(clientId);
        return this.balances.getBalance(clientId);
    }

    async getProgress(clientId: string): Promise<RewardProgress> {
        await this.users.getClient(clientId);
        const program = await this.getActiveProgram();
        const balance = await this.balances.getBalance(clientId);

        if (program.redeemMode !== "free_item") {
            return { balance, rewardsAvailable: 0, pointsToNextReward: null };
        }
        return {
            balance,
            rewardsAvailable: Math.floor(balance / program.pointsPerReward),
            pointsToNextReward: program.pointsPerReward - (balance % program.pointsPerReward),
        };
    }

    /** -------------------------------------------- HELPERS -------------------------------------------- */

    private async getActiveProgram(): Promise<LoyaltyProgram> {
        const program = await this.programs.findActive();
        if (!program) {
            throw new NoActiveProgramError();
        }
        return program;
    }

    private async assertNameFree(name: string, exceptId?: string): Promise<void> {
        const found = await this.programs.findByName(name);
        if (found && found.id !== exceptId) {
            throw new DuplicateNameError("LoyaltyProgram", name);
        }
    }

    private async applyChange(clientId: string, amount: number): Promise<BalanceChange> {
        const balanceAfter = await this.balances.change(clientId, amount);
        return { clientId, amount, balanceAfter };
    }
}