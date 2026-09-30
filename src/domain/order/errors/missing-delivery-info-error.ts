import { DomainError } from "../../shared/domain-error.js";

/**
 * Thrown when confirming a delivery order that lacks required delivery data.
 *
 * Delivery orders need a delivery address (stored in `deliveryNotes`) and
 * must specify who provides the courier (`deliveryMode`). Pickup orders do
 * not require either.
 *
 * @param missingFields - Names of the missing fields
 * (e.g. `["deliveryNotes", "deliveryMode"]`).
 */
export class MissingDeliveryInfoError extends DomainError {
  constructor(public readonly missingFields: string[]) {
    super(`Delivery order is missing: ${missingFields.join(", ")}`);
  }
}