import { DomainError } from "./domain-error.js";

export class NotFoundError extends DomainError {
    constructor(readonly entityName: string, readonly id: string){
        super(`${entityName} with id "${id}" was not found`);
    }
}