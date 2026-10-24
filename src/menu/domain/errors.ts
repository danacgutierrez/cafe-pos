import { DomainError } from "../../shared/domain-error";

// a Drink IS the valid type+flavor combination, so preventing duplicates here is what
// keeps "only allowed flavors per type" true - there's no separate flavor-allowlist to check.
export class DuplicateDrinkError extends DomainError {
  constructor(readonly drinkTypeId: string, readonly drinkFlavorId: string) {
    super(`A drink already exists for type "${drinkTypeId}" and flavor "${drinkFlavorId}"`);
  }
}

// covers drinks, sizes, milk types, sweeteners and extras - anything the
// customer could try to order that's been turned off.
export class InactiveOptionError extends DomainError {
    constructor(readonly optionType: string, readonly id: string) {
        super(`The ${optionType} "${id}" is not active and cannot be used`);
    }
}

// hard delete is blocked while something else still depends on the record
// (a drink that uses it, or a past order); deactivation is the supported way
// to remove it from the menu after that point.
export class InUseError extends DomainError {
    constructor(readonly entityType: string, readonly id: string) {
        super(`Cannot delete ${entityType} "${id}" because it is still in use; deactivate it instead`);
    }
}

// a drink with no size could never be ordered, so it is not allowed to exist.
export class DrinkWithoutSizesError extends DomainError {
    constructor() {
        super("A drink must offer at least one size");
    }
}

// the sweetness order must be unambiguous, so two sweeteners cannot share a level.
export class DuplicateSweetenerLevelError extends DomainError {
    constructor(readonly level: number) {
        super(`A sweetener with level ${level} already exists`);
    }
}

// the units of an extra on a drink can never go over that extra's maximum.
export class ExtraQuantityExceededError extends DomainError {
    constructor(readonly extraId: string, readonly total: number, readonly maxQuantity: number) {
        super(`The extra "${extraId}" would have ${total} units, but the maximum is ${maxQuantity}`);
    }
}

// the total price of a drink must be greater than zero and not exceed the technical limit.
export class PriceOutOfRangeError extends DomainError {
    constructor(readonly priceCents: number) {
        super(`The total price of ${priceCents} cents must be greater than 0 and at most the allowed maximum`);
    }
}
