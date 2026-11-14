/** How the client receives the order: picks it up, or has it brought. */
export type FulfillmentType = "pickup" | "delivery";

/** Who brings a delivery order: the business itself, or a third party. */
export type DeliveryMode = "own" | "third_party";

/** The client picks it up: no address, no fee. */
export interface PickupFulfillment {
    fulfillmentType: "pickup";
}

export interface DeliveryFulfillment {
    fulfillmentType: "delivery";
    deliveryAddress: string;
    deliveryMode: DeliveryMode;
    deliveryFeeCents: number;
}

export type Fulfillment = PickupFulfillment | DeliveryFulfillment;