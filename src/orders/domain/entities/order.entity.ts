import { Fulfillment } from "./fulfillment.entity";
import { OrderDetail } from "./order-detail.entity";

/** Where an order is in its life. It only moves forward, except cancelling. */
export type OrderStatus = "pending" | "preparing" | "ready" | "delivered" | "cancelled";

/**
 * What loyalty took to pay for this order. Loyalty keeps no history, so the order keeps it
 * in order to give back exactly this amount if it is cancelled.
 */
export interface LoyaltyRedemption {
    /** Points or cents taken from the client, without the sign (what refund() needs). */
    amount: number;
    /** Money this redemption covers on the order. */
    coveredCents: number;
}

interface BaseOrder {
    readonly id: string;
    readonly clientId: string;
    /** The branch that prepares it. */
    readonly locationId: string;
    status: OrderStatus;
    /** When the client wants it. */
    scheduleTime: Date;
    notes?: string;
    items: OrderDetail[];
    /** Items + delivery fee, before any loyalty redemption. */
    totalCents: number;
    loyaltyRedemption?: LoyaltyRedemption;
    readonly createdAt: Date;
    updatedAt: Date;
}

export type Order = BaseOrder & Fulfillment;