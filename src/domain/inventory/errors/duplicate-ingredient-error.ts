import { DomainError } from "../../shared/domain-error.js";

export class DuplicateIngredientError extends DomainError {
  constructor(
    public readonly name: string,
    public readonly measureType: string,
  ) {
    super(`There's already an ingredient call "${name}" with measurement type "${measureType}"`);
  }
}