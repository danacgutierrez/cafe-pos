import { DeliveryMode } from "../entities/fulfillment.entity";
import { ProductConfiguration } from "../entities/product-configuration.entity";

/** One line the client wants: a configured product and how many units. No prices: the service calculates them. */
export interface OrderItemInput {
    configuration: ProductConfiguration;
    quantity: number;
}

export interface PickupInput {
    fulfillmentType: "pickup";
}

export interface DeliveryInput {
    fulfillmentType: "delivery";
    deliveryAddress: string;
    deliveryMode: DeliveryMode;
    /** Provisional: the business has not defined how the fee is worked out, so the caller sends it. */
    deliveryFeeCents: number;
}

export type FulfillmentInput = PickupInput | DeliveryInput;

/** One free item: the unit of the line at `itemIndex` is not charged. Needs a "free_item" program. */
export interface FreeItemRedemptionInput {
    mode: "free_item";
    /** Position of the line in `items` whose unit becomes free. */
    itemIndex: number;
}

/** Part of the total is paid with the client's balance. Needs an "account_balance" program. */
export interface BalanceRedemptionInput {
    mode: "account_balance";
    amountCents: number;
}

/** The program decides which one is valid; the service rejects the other (RedeemModeMismatchError). */
export type LoyaltyRedemptionInput = FreeItemRedemptionInput | BalanceRedemptionInput;

export interface CreateOrderInput {
    clientId: string;
    locationId: string;
    scheduleTime: Date;
    notes?: string;
    items: OrderItemInput[];
    fulfillment: FulfillmentInput;
    /** Optional. At most one redemption per order. */
    loyalty?: LoyaltyRedemptionInput;
}