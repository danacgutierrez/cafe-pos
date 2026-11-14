import { DomainError } from "../../shared/domain-error";

// the same error for "no such user" and "wrong password", so it never reveals which usernames exist.
export class InvalidCredentialsError extends DomainError {
    constructor() {
        super("The username/email or the password is incorrect");
    }
}

// the account is valid, but a deactivated staff member cannot operate.
export class InactiveStaffError extends DomainError {
    constructor(readonly staffId: string) {
        super(`The staff member "${staffId}" is not active`);
    }
}

// nobody can create the first administrator through the normal flow, so
// the bootstrap is only allowed while there is none.
export class AdministratorAlreadyExistsError extends DomainError {
    constructor() {
        super("An administrator already exists");
    }
}