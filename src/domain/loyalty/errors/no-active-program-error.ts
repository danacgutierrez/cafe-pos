import { DomainError } from "../../shared/domain-error.js";

/**
 * Thrown when an operation needs an active loyalty program but none exists.
 */
export class NoActiveProgramError extends DomainError {
  constructor() {
    super("There is no active loyalty program");
  }
}