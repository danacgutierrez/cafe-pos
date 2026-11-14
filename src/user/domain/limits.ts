export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const EMAIL_MAX_LENGTH = 254;
export const PERSON_NAME_MAX_LENGTH = 50;

// Provisional: the password rules are not a client requirement yet.
// The maximum is a technical guard (bcrypt only reads the first 72 bytes).
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

// Provisional: phone numbers are assumed to be Mexican (10 digits, optional +52).
export const PHONE_DIGITS = 10;