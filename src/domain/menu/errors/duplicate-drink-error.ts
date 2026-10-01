import { DomainError } from "../../shared/domain-error.js";

export class DuplicateDrinkError extends DomainError {
  constructor(drinkTypeId: string, flavorId: string) {
    super(`A drink already exists for type "${drinkTypeId}" and flavor "${flavorId}"`);
  }
}