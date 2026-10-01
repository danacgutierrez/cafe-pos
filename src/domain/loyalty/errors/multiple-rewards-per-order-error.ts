import { DomainError } from "../../shared/domain-error.js";

/**
 * Thrown when an order tries to redeem more than one reward.
 *
 * Limiting redemptions to one per order prevents the whole balance from
 * being spent at once.
 *
 * @param requested - Number of rewards requested in the order.
 */
export class MultipleRewardsPerOrderError extends DomainError {
  constructor(public readonly requested: number) {
    super(`Only one reward can be redeemed per order, requested ${requested}`);
  }
}