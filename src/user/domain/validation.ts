import { InvalidInputError } from "../../shared/invalid-input-error";
import { AccountInput } from "./models/user-inputs";
import {
    EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH,
    PHONE_DIGITS, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH,
} from "./limits";

const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeUsername(username: string): string {
    const clean = username.trim();

    if (clean.length < USERNAME_MIN_LENGTH || clean.length > USERNAME_MAX_LENGTH) {
        throw new InvalidInputError("username", `must have between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters`);
    }
    if (!USERNAME_PATTERN.test(clean)) {
        throw new InvalidInputError("username", "can only contain letters, numbers, dots, dashes and underscores");
    }

    return clean;
}

export function normalizeEmail(email: string): string {
    const clean = email.trim().toLowerCase();

    if (clean.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(clean)) {
        throw new InvalidInputError("email", "is not a valid email address");
    }

    return clean;
}

/** The password is never trimmed or changed: what the person typed is what gets hashed. */
export function assertValidPassword(password: string): void {
    if (password.trim() === "") {
        throw new InvalidInputError("password", "cannot be blank");
    }
    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
        throw new InvalidInputError("password", `must have between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`);
    }
}

/** Keeps only the digits; a leading 52 (country code) is dropped. */
export function normalizePhone(phone: string): string {
    let digits = phone.replace(/\D/g, "");

    if (digits.length === PHONE_DIGITS + 2 && digits.startsWith("52")) {
        digits = digits.slice(2);
    }
    if (digits.length !== PHONE_DIGITS) {
        throw new InvalidInputError("phoneNumber", `must have ${PHONE_DIGITS} digits`);
    }

    return digits;
}

/** Checks the three fields every account has, and returns the cleaned username and email. */
export function normalizeAccount(input: AccountInput): { username: string; email: string } {
    const username = normalizeUsername(input.username);
    const email = normalizeEmail(input.email);
    assertValidPassword(input.password);

    return { username, email };
}