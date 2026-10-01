import { DomainError } from "./domain-error.js";

export class NotFoundError extends DomainError {
    constructor(entityName: string, id: string){
        super(`${entityName} with id "${id}" was not found`);
    }
}