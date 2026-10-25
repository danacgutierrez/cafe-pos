/**
 * This is the ONLY file in the scenarios that knows the in-memory implementations.
 * Swapping the persistence layer happens here.
 */
import { MenuService } from "../menu/menu.service";
import { MenuOptionsService } from "../menu/menu-options.service";
import { CreateDrinkInput } from "../menu/domain/models/create-drink-input";
import { InMemoryDrinkRepository } from "../menu/infra/in-memory-drink.repository";
import { InMemoryDrinkTypeRepository } from "../menu/infra/in-memory-drink-type.repository";
import { InMemoryDrinkFlavorRepository } from "../menu/infra/in-memory-drink-flavor.repository";
import { InMemorySizeRepository } from "../menu/infra/in-memory-size.repository";
import { InMemoryMilkTypeRepository } from "../menu/infra/in-memory-milk-type.repository";
import { InMemorySweetenerRepository } from "../menu/infra/in-memory-sweetener.repository";
import { InMemoryExtraRepository } from "../menu/infra/in-memory-extra.repository";
import { LocationService } from "../location/location.service";
import { LocationUsageChecker } from "../location/domain/location-usage-checker";
import { InMemoryLocationRepository } from "../location/infra/in-memory-location.repository";
import { UserService } from "../user/user.service";
import { PasswordHasher } from "../user/domain/password-hasher";
import { Administrator, Staff } from "../user/domain/entities/user.entity";
import { RegisterClientInput } from "../user/domain/models/user-inputs";
import { InMemoryUserRepository } from "../user/infra/in-memory-user.repository";
import { StaffLocationUsageChecker } from "../user/infra/staff-location-usage-checker";
import { LoyaltyService } from "../loyalty/loyalty.service";
import { CreateProgramInput } from "../loyalty/domain/models/loyalty-inputs";
import { InMemoryLoyaltyProgramRepository } from "../loyalty/infra/in-memory-loyalty-program.repository";
import { InMemoryClientBalanceRepository } from "../loyalty/infra/in-memory-client-balance.repository";
import { Clock } from "../shared/clock";

/** Builds an empty menu. Each scenario starts from scratch. */
export function buildMenu() {
    const drinks = new InMemoryDrinkRepository();
    const drinkTypes = new InMemoryDrinkTypeRepository();
    const drinkFlavors = new InMemoryDrinkFlavorRepository();
    const sizes = new InMemorySizeRepository();
    const milkTypes = new InMemoryMilkTypeRepository();
    const sweeteners = new InMemorySweetenerRepository();
    const extras = new InMemoryExtraRepository();

    const menu = new MenuService(drinks, drinkTypes, drinkFlavors, sizes, milkTypes, sweeteners, extras);
    const options = new MenuOptionsService(drinks, drinkTypes, drinkFlavors, sizes, milkTypes, sweeteners, extras);

    return { menu, options, drinks, drinkTypes, drinkFlavors, sizes, milkTypes, sweeteners, extras };
}

export type Kit = ReturnType<typeof buildMenu>;

/** A small catalog with one or two of everything, the basis of most scenarios. */
export async function seedCatalog(options: MenuOptionsService) {
    return {
        matcha: await options.createDrinkType("Matcha", 4500),
        bananaPudding: await options.createDrinkFlavor("Banana pudding", 500),
        small: await options.createSize("Small", 0),
        large: await options.createSize("Large", 1000),
        wholeMilk: await options.createMilkType("Whole milk", 0),
        oatMilk: await options.createMilkType("Oat milk", 1500),
        light: await options.createSweetener("Light", 1, 0),
        extraSweet: await options.createSweetener("Extra sweet", 3, 300),
        coldFoam: await options.createExtra("Cold foam", 1200, 2),
        espressoShot: await options.createExtra("Espresso shot", 1500, 3),
    };
}

export type Catalog = Awaited<ReturnType<typeof seedCatalog>>;

/** The minimum a drink needs: a type, a flavor and one size. */
export function basicDrinkInput(catalog: Catalog, overrides: Partial<CreateDrinkInput> = {}): CreateDrinkInput {
    return {
        name: "Banana pudding matcha",
        description: "Matcha with banana pudding flavor",
        drinkTypeId: catalog.matcha.id,
        drinkFlavorId: catalog.bananaPudding.id,
        sizeIds: [catalog.small.id],
        ...overrides,
    };
}

/** The drink the manager sells: two sizes, two milks, two sweeteners, and cold foam included. */
export function fullDrinkInput(catalog: Catalog, overrides: Partial<CreateDrinkInput> = {}): CreateDrinkInput {
    return basicDrinkInput(catalog, {
        sizeIds: [catalog.small.id, catalog.large.id],
        milkTypeIds: [catalog.wholeMilk.id, catalog.oatMilk.id],
        sweetenerIds: [catalog.light.id, catalog.extraSweet.id],
        extras: [
            { extraId: catalog.coldFoam.id, includedQuantity: 1 },
            { extraId: catalog.espressoShot.id, includedQuantity: 0 },
        ],
        imageUrl: "https://example.com/banana-pudding-matcha.png",
        ...overrides,
    });
}

/** A usage checker the scenarios can switch on, to simulate staff/orders/inventory using a location. */
class SwitchableUsageChecker implements LocationUsageChecker {
    private readonly inUse = new Set<string>();

    markInUse(locationId: string): void {
        this.inUse.add(locationId);
    }

    async isInUse(locationId: string): Promise<boolean> {
        return this.inUse.has(locationId);
    }
}

/** Builds an empty set of locations. */
export function buildLocation() {
    const repository = new InMemoryLocationRepository();
    const usage = new SwitchableUsageChecker();
    const locations = new LocationService(repository, usage);

    return { locations, repository, usage };
}

/** A fake hasher so the scenarios don't depend on bcrypt: deterministic, and never equal to the password. */
class FakePasswordHasher implements PasswordHasher {
    async hash(password: string): Promise<string> {
        return `fake-hash:${[...password].reverse().join("")}`;
    }

    async verify(password: string, passwordHash: string): Promise<boolean> {
        return passwordHash === (await this.hash(password));
    }
}

export const PASSWORD = "correct-horse";

/** Builds empty users and locations. Locations know about staff, so a location with staff cannot be deleted. */
export function buildUsers() {
    const userRepository = new InMemoryUserRepository();
    const locationRepository = new InMemoryLocationRepository();
    const hasher = new FakePasswordHasher();

    const locations = new LocationService(locationRepository, new StaffLocationUsageChecker(userRepository));
    const users = new UserService(userRepository, locationRepository, hasher);

    return { users, locations, userRepository, locationRepository, hasher };
}

export type UsersKit = ReturnType<typeof buildUsers>;

/** A valid client sign-up; each scenario overrides only what it wants to break. */
export function clientInput(overrides: Partial<RegisterClientInput> = {}): RegisterClientInput {
    return {
        username: "ana.lopez",
        email: "ana@example.com",
        password: PASSWORD,
        firstName: "Ana",
        lastName: "López",
        phoneNumber: "6621234567",
        ...overrides,
    };
}

export function seedAdministrator(kit: UsersKit): Promise<Administrator> {
    return kit.users.bootstrapAdministrator({ username: "admin", email: "admin@cafe.test", password: PASSWORD });
}

/** An administrator, a location and an active staff member working there. */
export async function seedStaff(kit: UsersKit) {
    const admin = await seedAdministrator(kit);
    const location = await kit.locations.createLocation("Centro", "Calle 1");
    const staff: Staff = await kit.users.createStaff(admin.id, {
        username: "barista", email: "barista@cafe.test", password: PASSWORD, locationId: location.id,
    });
    return { admin, location, staff };
}

/** A clock the scenarios move by hand, so "updatedAt" can be checked. */
export class FakeClock implements Clock {
    private current = new Date(2026, 2, 2, 10, 0, 0);

    now(): Date {
        return new Date(this.current);
    }

    advanceHours(hours: number): void {
        this.current = new Date(this.current.getTime() + hours * 60 * 60 * 1000);
    }
}

/** Builds users and locations, plus loyalty on top of them, with a clock the scenarios control. */
export function buildLoyalty() {
    const kit = buildUsers();
    const clock = new FakeClock();
    const programRepository = new InMemoryLoyaltyProgramRepository();
    const loyalty = new LoyaltyService(programRepository, new InMemoryClientBalanceRepository(kit.userRepository), kit.users, clock);

    return { ...kit, loyalty, clock, programRepository };
}

export type LoyaltyKit = ReturnType<typeof buildLoyalty>;

/** 1 point per visit, a free item at 3 points. */
export function visitProgramInput(overrides: Partial<CreateProgramInput> = {}): CreateProgramInput {
    return { name: "Coffee card", earnMode: "per_visit", redeemMode: "free_item", earnValue: 1, pointsPerReward: 3, ...overrides };
}

/** 5% of what is paid comes back as balance. */
export function walletProgramInput(overrides: Partial<CreateProgramInput> = {}): CreateProgramInput {
    return { name: "Wallet", earnMode: "per_amount", redeemMode: "account_balance", earnValue: 5, ...overrides };
}

/** An administrator, a client, and the given program already active. */
export async function seedLoyalty(kit: LoyaltyKit, program: CreateProgramInput) {
    const admin = await seedAdministrator(kit);
    const client = await kit.users.registerClient(clientInput());
    const created = await kit.loyalty.createProgram(admin.id, program);
    await kit.loyalty.activateProgram(admin.id, created.id);
    return { admin, client, program: created };
}