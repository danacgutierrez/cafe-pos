import { DomainError } from "../../shared/domain-error.js";

/**
 * Thrown when repeating a previous order that contains an option
 * (milk type, size, sweetener, extra, etc.) that is no longer active.
 *
 * The customization is copied but prices are recalculated, and the client
 * must replace any inactive option.
 *
 * @param optionType - The kind of option (e.g. "MilkType", "Size").
 * @param optionId - The identifier of the inactive option.
 */
export class InactiveOptionError extends DomainError {
  constructor(
    public readonly optionType: string,
    public readonly optionId: string,
  ) {
    super(`${optionType} "${optionId}" is no longer active and must be replaced`);
  }
}