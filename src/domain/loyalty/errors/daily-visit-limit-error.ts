import { DomainError } from "../../shared/domain-error.js";

/**
 * Thrown when a client tries to earn a visit point more than once in the same day.
 *
 * In per-visit programs, a client can earn at most one point per day,
 * no matter how many orders they place.
 *
 * @param clientId - Identifier of the client.
 * @param date - The day on which the point was already earned.
 */
export class DailyVisitLimitError extends DomainError {
  constructor(
    public readonly clientId: string,
    public readonly date: Date,
  ) {
    super(
      `Client ${clientId} already earned a visit point on ${date.toISOString().slice(0, 10)}`,
    );
  }
}