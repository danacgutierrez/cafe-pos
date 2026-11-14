import { InvalidInputError } from "../../shared/invalid-input-error";
import { BalanceUnit, ProgramRule } from "./entities/loyalty-program.entity";
import { EARN_PERCENT_MAX, EARN_POINTS_PER_VISIT_MAX, POINTS_PER_REWARD_MAX } from "./limits";
import { ProgramConfig } from "./models/loyalty-inputs";

export function assertWholeNumber(field: string, value: number, min: number, max: number): void {
    if (!Number.isInteger(value) || value < min || value > max) {
        throw new InvalidInputError(field, `must be a whole number from ${min} to ${max}`);
    }
}

/**
 * Only two ways of working exist: points per visit for a free item, or a percentage of
 * what is paid as balance. Anything else is rejected. Returns the checked rule.
 */
export function buildProgramRule(config: ProgramConfig): ProgramRule {
    if (config.earnMode === "per_visit") {
        if (config.redeemMode !== "free_item") {
            throw new InvalidInputError("redeemMode", 'must be "free_item" when clients earn per visit');
        }
        assertWholeNumber("earnValue", config.earnValue, 1, EARN_POINTS_PER_VISIT_MAX);
        if (config.pointsPerReward === undefined) {
            throw new InvalidInputError("pointsPerReward", "is required when the reward is a free item");
        }
        assertWholeNumber("pointsPerReward", config.pointsPerReward, 1, POINTS_PER_REWARD_MAX);

        return { earnMode: "per_visit", redeemMode: "free_item", earnValue: config.earnValue, pointsPerReward: config.pointsPerReward };
    }

    if (config.earnMode === "per_amount") {
        if (config.redeemMode !== "account_balance") {
            throw new InvalidInputError("redeemMode", 'must be "account_balance" when clients earn per amount');
        }
        assertWholeNumber("earnValue", config.earnValue, 1, EARN_PERCENT_MAX);
        if (config.pointsPerReward !== undefined) {
            throw new InvalidInputError("pointsPerReward", "does not apply to balance programs");
        }

        return { earnMode: "per_amount", redeemMode: "account_balance", earnValue: config.earnValue };
    }

    throw new InvalidInputError("earnMode", 'must be "per_visit" or "per_amount"');
}

export function balanceUnit(rule: ProgramRule): BalanceUnit {
    return rule.earnMode === "per_visit" ? "points" : "cents";
}