import { randomUUID } from "crypto"
import { Administrator, Client, Staff, User } from "./domain/entities/user.entity"
import { UserRepository } from "./domain/repositories/user.repository"
import { PasswordHasher } from "./domain/password-hasher"
import { AccountInput, CreateStaffInput, RegisterClientInput } from "./domain/models/user-inputs"
import { AdministratorAlreadyExistsError, InactiveStaffError, InvalidCredentialsError } from "./domain/errors"
import { PERSON_NAME_MAX_LENGTH } from "./domain/limits"
import { normalizeAccount, normalizePhone } from "./domain/validation"
import { LocationRepository } from "../location/domain/repositories/location.repository"
import { DuplicateNameError } from "../shared/duplicate-name-error"
import { normalizeText } from "../shared/normalize-text"
import { NotFoundError } from "../shared/not-found-error"
import { UnauthorizedActionError } from "../shared/unauthorized-action-error"

export class UserService {
    constructor(
        private readonly users: UserRepository,
        private readonly locations: LocationRepository,
        private readonly hasher: PasswordHasher,
    ) { }

    /** -------------------------------------------- CREATE -------------------------------------------- */

    /** A client signs up on their own. Starts with an empty loyalty balance. */
    async registerClient(input: RegisterClientInput): Promise<Client> {
        const account = normalizeAccount(input);
        const firstName = normalizeText("firstName", input.firstName, PERSON_NAME_MAX_LENGTH);
        const lastName = normalizeText("lastName", input.lastName, PERSON_NAME_MAX_LENGTH);
        const phoneNumber = normalizePhone(input.phoneNumber);
        const passwordHash = await this.claimAccount(account, input.password);

        const client: Client = { id: randomUUID(), role: "client", ...account, passwordHash, firstName, lastName, phoneNumber, loyaltyBalance: 0 };
        await this.users.save(client);
        return client;
    }

    /** Only an administrator creates staff, and the location must exist. Staff start active. */
    async createStaff(actorId: string, input: CreateStaffInput): Promise<Staff> {
        await this.requireAdministrator(actorId, "create staff");
        const account = normalizeAccount(input);
        if (!(await this.locations.findById(input.locationId))) {
            throw new NotFoundError("Location", input.locationId);
        }
        const passwordHash = await this.claimAccount(account, input.password);

        const staff: Staff = { id: randomUUID(), role: "staff", ...account, passwordHash, isActive: true, locationId: input.locationId };
        await this.users.save(staff);
        return staff;
    }

    /** Creates the first administrator. Nobody can do it through the normal flow, so it only works while there is none. */
    async bootstrapAdministrator(input: AccountInput): Promise<Administrator> {
        const account = normalizeAccount(input);
        if (await this.users.existsByRole("administrator")) {
            throw new AdministratorAlreadyExistsError();
        }
        const passwordHash = await this.claimAccount(account, input.password);

        const administrator: Administrator = { id: randomUUID(), role: "administrator", ...account, passwordHash };
        await this.users.save(administrator);
        return administrator;
    }

    /** -------------------------------------------- ACTIVATE / DEACTIVATE -------------------------------------------- */
    // Staff are never deleted: they keep their history, and turning them off is how they leave.

    activateStaff(actorId: string, staffId: string): Promise<Staff> {
        return this.setStaffActive(actorId, staffId, true);
    }

    deactivateStaff(actorId: string, staffId: string): Promise<Staff> {
        return this.setStaffActive(actorId, staffId, false);
    }

    /** -------------------------------------------- AUTHENTICATE -------------------------------------------- */

    /** Accepts the username or the email. A deactivated staff member cannot get in. */
    async authenticate(identifier: string, password: string): Promise<User> {
        const clean = identifier.trim();
        const user = (await this.users.findByUsername(clean)) ?? (await this.users.findByEmail(clean));

        if (!user || !(await this.hasher.verify(password, user.passwordHash))) {
            throw new InvalidCredentialsError();
        }
        if (user.role === "staff" && !user.isActive) {
            throw new InactiveStaffError(user.id);
        }
        return user;
    }

    async getUser(id: string): Promise<User> {
        const user = await this.users.findById(id);
        if (!user) {
            throw new NotFoundError("User", id);
        }
        return user;
    }

    /** -------------------------------------------- HELPERS -------------------------------------------- */

    /** Checks the username and email are free, and only then pays for hashing the password. */
    private async claimAccount(account: { username: string; email: string }, password: string): Promise<string> {
        if (await this.users.findByUsername(account.username)) {
            throw new DuplicateNameError("Username", account.username);
        }
        if (await this.users.findByEmail(account.email)) {
            throw new DuplicateNameError("Email", account.email);
        }
        return this.hasher.hash(password);
    }

    async requireAdministrator(actorId: string, action: string): Promise<void> {
        const actor = await this.getUser(actorId);
        if (actor.role !== "administrator") {
            throw new UnauthorizedActionError(action);
        }
    }

    private async setStaffActive(actorId: string, staffId: string, isActive: boolean): Promise<Staff> {
        await this.requireAdministrator(actorId, isActive ? "activate staff" : "deactivate staff");
        const staff = await this.users.findById(staffId);
        if (!staff || staff.role !== "staff") {
            throw new NotFoundError("Staff", staffId);
        }
        if (staff.isActive === isActive) {
            return staff;
        }
        const updated: Staff = { ...staff, isActive };
        await this.users.save(updated);
        return updated;
    }

     /** A user that must be a client; anyone else is "not found" as a client. */
    async getClient(id: string): Promise<Client> {
        const user = await this.users.findById(id);
        if (!user || user.role !== "client") {
            throw new NotFoundError("Client", id);
        }
        return user;
    }
}