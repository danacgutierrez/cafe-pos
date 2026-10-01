/** How the client receives the order. */
export type FulfillmentType = "delivery" | "pickup";

/** Who provides the courier for a delivery order. */
export type DeliveryMode = "own_courier" | "client_courier";

/**
 * Lifecycle status of an order.
 *
 * Statuses advance in this order: `received`, `in_preparation`, `ready`,
 * `delivered`. `cancelled` is a final status reachable only from `received`.
 */
export type OrderStatus =
  | "received"
  | "in_preparation"
  | "ready"
  | "delivered"
  | "cancelled";

/** A purchase placed by a client. */
export interface Order {
  /** Unique identifier of the order. */
  readonly id: string;

  /** Identifier of the client who placed the order. */
  readonly idClient: string;

  /** Date and time the client wants the order to be ready. */
  readonly scheduleTime: Date;

  /** Date and time the order was created. */
  readonly createdAt: Date;

  /** General notes about the order. */
  notes: string;

  /** Total amount to pay: the sum of all lines plus the delivery fee, if any. */
  total: number;

  /** Current lifecycle status of the order. */
  status: OrderStatus;

  /** Whether the order is delivered to the client or picked up. */
  fulfillmentType: FulfillmentType;

  /** Where to deliver the order. Only present for delivery orders. */
  deliveryAddress?: string;

  /** Who provides the courier. Only present for delivery orders. */
  deliveryMode?: DeliveryMode;

  /** Cost of the delivery. Only present for delivery orders. */
  deliveryFee?: number;
}