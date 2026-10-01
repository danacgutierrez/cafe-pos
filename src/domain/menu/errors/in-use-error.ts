import { DomainError } from "../../shared/domain-error.js";

export class InUseError extends DomainError {
    constructor(entityType: string, id: string) {
        super(`Cannot delete ${entityType} "${id}" because it already has orders; deactivate it instead`);
    }
}