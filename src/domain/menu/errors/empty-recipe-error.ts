import { DomainError } from "../../shared/domain-error.js";

export class EmptyRecipeError extends DomainError {
    constructor(drinkId: string) {
        super(`Cannot activate drink "${drinkId}" without a recipe`);
    }
}