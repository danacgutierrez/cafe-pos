import assert from "node:assert/strict";
import { InvalidInputError } from "../shared/invalid-input-error";

/**
 * Runs an action that MUST be rejected by a domain rule.
 * Fails if the action succeeds or throws an error of another class.
 */
export async function expectRejected<T extends Error>(
    action: () => Promise<unknown>,
    expected: new (...args: never[]) => T,
): Promise<T> {
    let caught: unknown;
    try {
        await action();
    } catch (error) {
        caught = error;
    }
    if (caught === undefined) {
        throw new Error(`Expected ${expected.name}, but the operation succeeded`);
    }
    if (!(caught instanceof expected)) {
        throw new Error(`Expected ${expected.name}, got: ${String(caught)}`);
    }
    return caught;
}

/** Like expectRejected, but also checks which field was reported. */
export async function expectInvalidField(
    action: () => Promise<unknown>,
    field: string,
): Promise<void> {
    const error = await expectRejected(action, InvalidInputError);
    assert.equal(error.field, field);
}
