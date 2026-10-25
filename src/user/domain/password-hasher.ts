/**
 * The domain never knows how passwords are protected (bcrypt, argon2...).
 * The real implementation lives in infrastructure.
 */
export interface PasswordHasher {
    hash(password: string): Promise<string>;
    verify(password: string, passwordHash: string): Promise<boolean>;
}