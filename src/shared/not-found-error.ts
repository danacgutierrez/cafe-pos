import { DomainError } from "./domain-error";

export class NotFoundError extends DomainError {
    constructor(readonly entityName: string, readonly id: string){
        super(`${entityName} with id "${id}" was not found`);
    }
}