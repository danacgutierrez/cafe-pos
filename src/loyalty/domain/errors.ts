import { DomainError } from "../../shared/domain-error";
import { RedeemMode } from "./entities/loyalty-program.entity";

export class NoActiveProgramError extends DomainError {
    constructor() {
        super("There is no active loyalty program");
    }
}

// loyalty is only granted once the order is delivered, so a cancelled order cannot give anything away.
export class OrderNotEligibleForLoyaltyError extends DomainError {
    constructor(readonly orderId: string) {
        super(`Order "${orderId}" has not been delivered yet and cannot earn loyalty`);
    }
}

// the balance can never go below 0.
export class InsufficientBalanceError extends DomainError {
    constructor(readonly clientId: string, readonly required: number, readonly available: number) {
        super(`Client "${clientId}" needs ${required} but only has ${available}`);
    }
}

// one reward per order, so the whole balance cannot be spent at once.
export class MultipleRewardsPerOrderError extends DomainError {
    constructor(readonly requested: number) {
        super(`Only one reward can be redeemed per order, requested ${requested}`);
    }
}

export class BalanceExceedsOrderTotalError extends DomainError {
    constructor(readonly requestedCents: number, readonly orderTotalCents: number) {
        super(`Cannot apply ${requestedCents} cents of balance to an order totaling ${orderTotalCents} cents`);
    }
}

// the active program redeems another way (free items vs balance).
export class RedeemModeMismatchError extends DomainError {
    constructor(readonly required: RedeemMode) {
        super(`The active loyalty program does not work with "${required}"`);
    }
}

// points and cents cannot be added together, so switching needs an explicit reset.
export class ProgramSwitchWouldMixUnitsError extends DomainError {
    constructor(readonly clientsWithBalance: number) {
        super(`Cannot switch to a program with another unit while ${clientsWithBalance} client(s) still have balance; reset the balances to continue`);
    }
}