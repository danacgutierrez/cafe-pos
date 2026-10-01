import type { OrderStatus } from "./order.entity.js";

/** A record of a status change of an order. */
export interface OrderStatusHistory {
  /** Unique identifier of the history entry. */
  readonly id: string;

  /** Identifier of the order whose status changed. */
  readonly orderId: string;

  /** Identifier of the user who made the change. */
  readonly changedById: string;

  /** The status the order was changed to. */
  status: OrderStatus;

  /** Date and time of the change. */
  changedAt: Date;
}