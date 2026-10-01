import type { OrderDetail } from "./order-detail.entity.js";

/**
 * An order line for a drink, including the customization chosen by the client.
 * Since each drink is customized, its `quantity` is always 1.
 */
export interface DrinkOrderDetail extends OrderDetail {
  /** Identifier of the chosen milk type. */
  readonly milkTypeId: string;

  /** Identifier of the chosen size. */
  readonly sizeId: string;

  /** Identifier of the chosen sweetener. */
  readonly sweetenerId: string;

  /** How sweet the client wants the drink. */
  sweetnessLevel: number;

  /** Whether the drink is free of charge for the client. */
  isFree: boolean;
}