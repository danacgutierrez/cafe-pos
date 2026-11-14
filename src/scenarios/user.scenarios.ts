import assert from "node:assert/strict";
import { LocationInUseError } from "../location/domain/errors";
import { DuplicateNameError } from "../shared/duplicate-name-error";
import { NotFoundError } from "../shared/not-found-error";
import { UnauthorizedActionError } from "../shared/unauthorized-action-error";
import { AdministratorAlreadyExistsError, InactiveStaffError, InvalidCredentialsError } from "../user/domain/errors";
import { PASSWORD_MAX_LENGTH } from "../user/domain/limits";
import { expectInvalidField, expectRejected } from "./helpers";
import { Scenario } from "./scenario";
import { buildUsers, clientInput, PASSWORD, seedAdministrator, seedStaff } from "./setup";

export const userScenarios: Scenario[] = [
    {
        title: "A client signs up on their own, with clean data and a hashed password",
        kind: "works",
        async run() {
            const { users, hasher } = buildUsers();

            const client = await users.registerClient(clientInput({
                username: " ana.lopez ", email: " Ana@Example.COM ", firstName: "  Ana  ", phoneNumber: "+52 (662) 123-4567",
            }));

            assert.equal(client.role, "client");
            assert.equal(client.username, "ana.lopez");
            assert.equal(client.email, "ana@example.com");
            assert.equal(client.firstName, "Ana");
            assert.equal(client.phoneNumber, "6621234567");
            assert.equal(client.loyaltyBalance, 0, "starts with an empty balance");
            assert.notEqual(client.passwordHash, PASSWORD, "the password is never stored as typed");
            assert.equal(await hasher.verify(PASSWORD, client.passwordHash), true);
            console.log("  OK: client created, balance 0, phone", client.phoneNumber);
        },
    },
    {
        title: "Invalid account, name and phone fields are rejected",
        kind: "rejected",
        async run() {
            const { users, userRepository } = buildUsers();

            await expectInvalidField(() => users.registerClient(clientInput({ username: "ab" })), "username");
            await expectInvalidField(() => users.registerClient(clientInput({ username: "ana lopez" })), "username");
            await expectInvalidField(() => users.registerClient(clientInput({ email: "not-an-email" })), "email");
            await expectInvalidField(() => users.registerClient(clientInput({ password: "short" })), "password");
            await expectInvalidField(() => users.registerClient(clientInput({ password: "        " })), "password");
            await expectInvalidField(() => users.registerClient(clientInput({ password: "x".repeat(PASSWORD_MAX_LENGTH + 1) })), "password");
            await expectInvalidField(() => users.registerClient(clientInput({ firstName: "  " })), "firstName");
            await expectInvalidField(() => users.registerClient(clientInput({ lastName: "" })), "lastName");
            await expectInvalidField(() => users.registerClient(clientInput({ phoneNumber: "123" })), "phoneNumber");
            assert.equal((await userRepository.findAll()).length, 0, "nothing must be saved");
            console.log("  OK: nine invalid sign-ups rejected");
        },
    },
    {
        title: "A username and an email can only belong to one account, ignoring case",
        kind: "rejected",
        async run() {
            const { users, userRepository } = buildUsers();
            await users.registerClient(clientInput());

            const byName = await expectRejected(() => users.registerClient(clientInput({ username: "ANA.LOPEZ", email: "other@example.com" })), DuplicateNameError);
            const byEmail = await expectRejected(() => users.registerClient(clientInput({ username: "other", email: "ANA@example.com" })), DuplicateNameError);
            assert.equal((await userRepository.findAll()).length, 1);
            console.log("  OK: rejected ->", byName.message, "|", byEmail.message);
        },
    },
    {
        title: "The first administrator is created once",
        kind: "works",
        async run() {
            const kit = buildUsers();

            const admin = await seedAdministrator(kit);

            assert.equal(admin.role, "administrator");
            console.log("  OK: first administrator created ->", admin.username);
        },
    },
    {
        title: "A second administrator cannot be bootstrapped",
        kind: "rejected",
        async run() {
            const kit = buildUsers();
            await seedAdministrator(kit);

            const error = await expectRejected(
                () => kit.users.bootstrapAdministrator({ username: "other", email: "other@cafe.test", password: PASSWORD }),
                AdministratorAlreadyExistsError,
            );
            console.log("  OK: rejected ->", error.message);
        },
    },
    {
        title: "An administrator creates staff at an existing location",
        kind: "works",
        async run() {
            const kit = buildUsers();

            const { staff, location } = await seedStaff(kit);

            assert.equal(staff.role, "staff");
            assert.equal(staff.isActive, true);
            assert.equal(staff.locationId, location.id);
            assert.notEqual(staff.passwordHash, PASSWORD);
            console.log("  OK: staff created at", location.name);
        },
    },
    {
        title: "Only an administrator can create staff",
        kind: "rejected",
        main: true,
        async run() {
            const kit = buildUsers();
            const { staff, location } = await seedStaff(kit);
            const client = await kit.users.registerClient(clientInput());
            const input = { username: "intruder", email: "intruder@cafe.test", password: PASSWORD, locationId: location.id };

            const byClient = await expectRejected(() => kit.users.createStaff(client.id, input), UnauthorizedActionError);
            await expectRejected(() => kit.users.createStaff(staff.id, input), UnauthorizedActionError);
            await expectRejected(() => kit.users.createStaff("nobody", input), NotFoundError);
            assert.equal((await kit.userRepository.findByUsername("intruder")), null, "nothing must be saved");
            console.log("  OK: rejected ->", byClient.message);
        },
    },
    {
        title: "Staff must be assigned to a location that exists",
        kind: "rejected",
        async run() {
            const kit = buildUsers();
            const admin = await seedAdministrator(kit);

            await expectRejected(
                () => kit.users.createStaff(admin.id, { username: "barista", email: "barista@cafe.test", password: PASSWORD, locationId: "nowhere" }),
                NotFoundError,
            );
            assert.equal(await kit.userRepository.existsByRole("staff"), false);
            console.log("  OK: unknown location rejected");
        },
    },
    {
        title: "An administrator can turn staff off and on again",
        kind: "works",
        async run() {
            const kit = buildUsers();
            const { admin, staff } = await seedStaff(kit);

            const off = await kit.users.deactivateStaff(admin.id, staff.id);
            const offAgain = await kit.users.deactivateStaff(admin.id, staff.id);
            const on = await kit.users.activateStaff(admin.id, staff.id);

            assert.equal(off.isActive, false);
            assert.equal(offAgain.isActive, false, "doing it twice is harmless");
            assert.equal(on.isActive, true);
            console.log("  OK: off -> on, history kept (staff is never deleted)");
        },
    },
    {
        title: "Only an administrator can switch staff, and only staff can be switched",
        kind: "rejected",
        async run() {
            const kit = buildUsers();
            const { admin, staff } = await seedStaff(kit);
            const client = await kit.users.registerClient(clientInput());

            await expectRejected(() => kit.users.deactivateStaff(client.id, staff.id), UnauthorizedActionError);
            await expectRejected(() => kit.users.deactivateStaff(staff.id, staff.id), UnauthorizedActionError);
            await expectRejected(() => kit.users.deactivateStaff(admin.id, client.id), NotFoundError);
            const still = await kit.users.getUser(staff.id);
            assert.ok(still.role === "staff" && still.isActive, "must be untouched");
            console.log("  OK: client and staff blocked; a client is not staff");
        },
    },
    {
        title: "Anyone signs in with their username or their email",
        kind: "works",
        async run() {
            const { users } = buildUsers();
            const client = await users.registerClient(clientInput());

            assert.equal((await users.authenticate("ANA.LOPEZ", PASSWORD)).id, client.id);
            assert.equal((await users.authenticate(" ana@example.com ", PASSWORD)).id, client.id);
            console.log("  OK: username and email both work");
        },
    },
    {
        title: "A wrong password and an unknown user get the same error",
        kind: "rejected",
        async run() {
            const { users } = buildUsers();
            await users.registerClient(clientInput());

            const wrong = await expectRejected(() => users.authenticate("ana.lopez", "wrong-password"), InvalidCredentialsError);
            const unknown = await expectRejected(() => users.authenticate("nobody", PASSWORD), InvalidCredentialsError);
            assert.equal(wrong.message, unknown.message);
            console.log("  OK: rejected ->", wrong.message);
        },
    },
    {
        title: "A deactivated staff member cannot sign in until reactivated",
        kind: "rejected",
        async run() {
            const kit = buildUsers();
            const { admin, staff } = await seedStaff(kit);
            await kit.users.deactivateStaff(admin.id, staff.id);

            const error = await expectRejected(() => kit.users.authenticate("barista", PASSWORD), InactiveStaffError);
            await expectRejected(() => kit.users.authenticate("barista", "wrong-password"), InvalidCredentialsError);
            await kit.users.activateStaff(admin.id, staff.id);
            assert.equal((await kit.users.authenticate("barista", PASSWORD)).id, staff.id);
            console.log("  OK: rejected ->", error.message, "(and allowed again once reactivated)");
        },
    },
    {
        title: "A location with staff cannot be deleted",
        kind: "rejected",
        async run() {
            const kit = buildUsers();
            const { location } = await seedStaff(kit);
            const empty = await kit.locations.createLocation("Norte", "Calle 2");

            const error = await expectRejected(() => kit.locations.deleteLocation(location.id), LocationInUseError);
            await kit.locations.deleteLocation(empty.id);
            assert.equal((await kit.locations.listLocations()).length, 1);
            console.log("  OK: rejected ->", error.message, "(a location without staff can go)");
        },
    },
];