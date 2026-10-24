import { DomainError } from "./domain-error";

export class DuplicateNameError extends DomainError {
    constructor(readonly entityName: string, readonly repeated: string) {
        super(`${entityName}: "${repeated}"already exists`);
    }
}