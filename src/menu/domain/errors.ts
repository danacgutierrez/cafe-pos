import { DomainError } from "../../shared/domain-error";

// a Drink IS the valid type+flavor combination, so preventing duplicates here is what
// keeps "only allowed flavors per type" true - there's no separate flavor-allowlist to check.
export class DuplicateDrinkError extends DomainError {
  constructor(drinkTypeId: string, flavorId: string) {
    super(`A drink already exists for type "${drinkTypeId}" and flavor "${flavorId}"`);
  }
}

// covers drinks, sizes, milk types, sweeteners and extras - anything the
// customer could try to order that's been turned off.
export class InactiveOptionError extends DomainError {
    constructor(optionType: string, id: string) {
        super(`The ${optionType} "${id}" is not active and cannot be ordered`);
    }
}

// hard delete is blocked once something has real orders; deactivation is the only
// supported way to remove it from the menu after that point.
export class InUseError extends DomainError {
    constructor(entityType: string, id: string) {
        super(`Cannot delete ${entityType} "${id}" because it already has orders; deactivate it instead`);
    }
}