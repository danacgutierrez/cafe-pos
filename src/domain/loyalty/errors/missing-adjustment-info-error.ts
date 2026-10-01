import { DomainError } from "../../shared/domain-error.js";

/**
 * Thrown when a manual points adjustment lacks its reason or the person
 * responsible for it.
 *
 * Every correction must be recorded as an adjustment that explains why it
 * was made and who made it.
 *
 * @param missingFields - Names of the missing fields (e.g. `["reason"]`).
 */
export class MissingAdjustmentInfoError extends DomainError {
  constructor(public readonly missingFields: string[]) {
    super(`Adjustment is missing: ${missingFields.join(", ")}`);
  }
}