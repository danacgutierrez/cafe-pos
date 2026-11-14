import { ProductConfiguration } from "./product-configuration.entity";

/**
 * One line of the order. It has no id: it only exists inside its order and goes away with it.
 * The price is a snapshot, so changing the menu later never changes an order already made.
 */
export interface OrderDetail {
    configuration: ProductConfiguration;
    quantity: number;
    /** Price of ONE unit with everything already added, as it was when the order was made. */
    unitPriceCents: number;
}