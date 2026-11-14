import { DomainError } from "../../shared/domain-error";
import { OrderStatus } from "./entities/order.entity";

// an order with no lines has nothing to prepare nor to charge.
export class EmptyOrderError extends DomainError {
    constructor() {
        super("An order must have at least one item");
    }
}

// the status only moves forward (pending -> preparing -> ready -> delivered),
// and an order can be cancelled only until it is delivered.
export class InvalidStatusTransitionError extends DomainError {
    constructor(readonly orderId: string, readonly from: OrderStatus, readonly to: OrderStatus) {
        super(`Order "${orderId}" cannot go from "${from}" to "${to}"`);
    }
}

// a drink can be active and still not be orderable (no active size, an included extra turned off...).
// InactiveOptionError (menu) covers an option that was turned off; this covers the drink as a whole.
export class DrinkNotAvailableError extends DomainError {
    constructor(readonly drinkId: string) {
        super(`The drink "${drinkId}" is not available right now`);
    }
}

// the option exists, but this drink does not offer it (e.g. oat milk on a drink that allows only whole milk).
export class OptionNotAllowedForDrinkError extends DomainError {
    constructor(readonly optionType: string, readonly optionId: string, readonly drinkId: string) {
        super(`The ${optionType} "${optionId}" is not offered for the drink "${drinkId}"`);
    }
}

// a drink that offers milk needs one chosen; a drink with no milk list takes none.
export class MilkRequiredError extends DomainError {
    constructor(readonly drinkId: string) {
        super(`The drink "${drinkId}" requires a milk type`);
    }
}

// the total can never be zero nor go past the technical limit.
export class OrderTotalOutOfRangeError extends DomainError {
    constructor(readonly totalCents: number) {
        super(`The order total of ${totalCents} cents must be greater than 0 and at most the allowed maximum`);
    }
}