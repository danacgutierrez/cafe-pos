import { DomainError } from "../../shared/domain-error.js";

/**
 * Thrown when a client tries to redeem a reward without enough points.
 *
 * The points balance can never become negative.
 *
 * @param clientId - Identifier of the client.
 * @param required - Points needed for the reward.
 * @param available - Points the client currently has.
 */
export class InsufficientPointsError extends DomainError {
  constructor(
    public readonly clientId: string,
    public readonly required: number,
    public readonly available: number,
  ) {
    super(
      `Not enough points for client ${clientId}: required ${required}, available ${available}`,
    );
  }
}