export type UserRole = "client" | "staff" | "administrator";

interface BaseUser {
    readonly id: string;
    username: string;
    /** Always stored lowercase. */
    email: string;
    /** Never the password itself: whatever the PasswordHasher returned. */
    passwordHash: string;
    readonly role: UserRole;
}

export interface Client extends BaseUser {
    readonly role: "client";
    firstName: string;
    lastName: string;
    /** Only digits, no country code. */
    phoneNumber: string;
    /**
     * Whole number whose unit depends on the active loyalty program:
     * a count (visits/points) or cents of store credit. Only the loyalty
     * module changes it; it never goes below 0.
     */
    loyaltyBalance: number;
}

export interface Staff extends BaseUser {
    readonly role: "staff";
    isActive: boolean;
    locationId: string;
}

export interface Administrator extends BaseUser {
    readonly role: "administrator";
}

export type User = Client | Staff | Administrator;