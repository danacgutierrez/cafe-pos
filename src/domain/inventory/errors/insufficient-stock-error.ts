import { DomainError } from "../../shared/domain-error.js";

export class InsufficientStockError extends DomainError {
  constructor(
    public readonly ingredientId: string,
    public readonly requested: number,
    public readonly available: number,
  ) {
    super(
      `Not enough existence of the ingredient ${ingredientId}: requested ${requested}, there is ${available}`,
    );
  }
}