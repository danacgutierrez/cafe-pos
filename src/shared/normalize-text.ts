import { InvalidInputError } from "./invalid-input-error";

/** Cleans a text (NFC, no extra spaces) and checks it is not empty nor too long. */
export function normalizeText(field: string, value: string, maxLength: number): string {
    const clean = value.normalize("NFC").trim().replace(/\s+/g, " ");

    if (clean === "") {
        throw new InvalidInputError(field, "cannot be empty");
    }
    if (clean.length > maxLength) {
        throw new InvalidInputError(field, `cannot be longer than ${maxLength} characters`);
    }

    return clean;
}