import { DomainError } from "./domain-error";

export class InvalidInputError extends DomainError {
    constructor(readonly field: string, readonly reason: string) {
        super(`Invalid ${field}: ${reason}`);
    }
}