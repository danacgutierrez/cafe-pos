import { DomainError } from "../../shared/domain-error.js";

export class NonPositiveQuantityError extends DomainError {
  constructor(public readonly quantity: number) {
    super(`Quantity to register must be greater than zero, received ${quantity}`);
  }
}