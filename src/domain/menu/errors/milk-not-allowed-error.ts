import { DomainError } from "../../shared/domain-error.js";

export class MilkNotAllowedError extends DomainError {
    constructor(id: string) {
        super(`The drink with milk "${id}" is not allow it`);
    }
}