import { DomainError } from "./domain-error";

export class UnauthorizedActionError extends DomainError {
    constructor(readonly action: string) {
        super(`You are not allowed to ${action}`);
    }
}