/** A line of an order: a product and how many units were requested. */
export interface OrderDetail {
  /** Unique identifier of the line. */
  readonly id: string;

  /** Identifier of the order this line belongs to. */
  readonly orderId: string;

  /** Identifier of the ordered product. */
  readonly productId: string;

  /** Number of units requested. */
  quantity: number;

  /** Price of a single unit at the time the order was placed. */
  price: number;
}