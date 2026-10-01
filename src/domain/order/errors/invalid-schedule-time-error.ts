import { DomainError } from "../../shared/domain-error.js";

/**
 * Thrown when the scheduled time is in the past or does not leave enough
 * time to prepare the order.
 *
 * The minimum advance time is configurable (10 minutes by default).
 *
 * @param minAdvanceMinutes - Minimum number of minutes required between
 * now and the scheduled time.
 */
export class InvalidScheduleTimeError extends DomainError {
  constructor(public readonly minAdvanceMinutes: number) {
    super(`Order must be scheduled at least ${minAdvanceMinutes} minutes in advance`);
  }
}