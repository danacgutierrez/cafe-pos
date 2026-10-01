import { DomainError } from "../../shared/domain-error.js";

export class InactiveOptionError extends DomainError {
    constructor(optionType: string, id: string) {
        super(`The ${optionType} "${id}" is not active and cannot be ordered`);
    }
}