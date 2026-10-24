import { InvalidInputError } from "../../shared/invalid-input-error";
import { PriceOutOfRangeError } from "./errors";
import { MAX_PRICE_CENTS, NAME_MAX_LENGTH } from "./limits";

/** Cleans a name (NFC, no extra spaces) and checks its length. Comparison ignores case elsewhere. */
export function normalizeName(name: string): string {
    const clean = name.normalize("NFC").trim().replace(/\s+/g, " ");

    if (clean === "") {
        throw new InvalidInputError("name", "cannot be empty");
    }
    if (clean.length > NAME_MAX_LENGTH) {
        throw new InvalidInputError("name", `cannot be longer than ${NAME_MAX_LENGTH} characters`);
    }

    return clean;
}

/** A price of a single component (type, flavor, size...): whole cents, zero allowed. */
export function assertValidPrice(priceCents: number): void {
    if (!Number.isInteger(priceCents)) {
        throw new InvalidInputError("priceCents", "must be a whole number of cents");
    }
    if (priceCents < 0) {
        throw new InvalidInputError("priceCents", "cannot be negative");
    }
    if (priceCents > MAX_PRICE_CENTS) {
        throw new InvalidInputError("priceCents", `cannot exceed ${MAX_PRICE_CENTS} cents`);
    }
}

/** The price a customer pays for ONE drink: must be above zero and within the limit. */
export function assertValidTotalPrice(priceCents: number): void {
    if (!Number.isInteger(priceCents) || priceCents <= 0 || priceCents > MAX_PRICE_CENTS) {
        throw new PriceOutOfRangeError(priceCents);
    }
}

export function assertIntegerInRange(field: string, value: number, min: number, max: number): void {
    if (!Number.isInteger(value)) {
        throw new InvalidInputError(field, "must be a whole number");
    }
    if (value < min || value > max) {
        throw new InvalidInputError(field, `must be between ${min} and ${max}`);
    }
}

export function assertNoRepeats(field: string, ids: string[]): void {
    if (new Set(ids).size !== ids.length) {
        throw new InvalidInputError(field, "cannot contain repeated ids");
    }
}
