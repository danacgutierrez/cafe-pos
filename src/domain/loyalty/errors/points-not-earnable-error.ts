import { DomainError } from "../../shared/domain-error.js";

/**
 * Thrown when trying to grant points for something paid with points.
 *
 * Rewarded items and the part of an order paid with points do not generate
 * new points, which avoids chained rewards.
 *
 * @param orderId - Identifier of the order.
 */
export class PointsNotEarnableError extends DomainError {
  constructor(public readonly orderId: string) {
    super(`Order ${orderId} has nothing that can earn points: it was paid with points`);
  }
}