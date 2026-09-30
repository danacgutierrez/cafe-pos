import { randomUUID } from "node:crypto";
import { OrderRepository } from "../ports/order-repository.js";
import { DeliveryMode, FulfillmentType, Order, OrderStatus } from "../entities/order.entity.js";
import { OrderDetail } from "../entities/order-detail.entity.js";
import { OrderStatusHistory } from "../entities/order-status-history.entity.js";
import { EmptyOrderError } from "../errors/empty-order-error.js";
import { MissingDeliveryInfoError } from "../errors/missing-delivery-info-error.js";
import { InvalidScheduleTimeError } from "../errors/invalid-schedule-time-error.js";
import { InvalidStatusTransitionError } from "../errors/invalid-status-transition-error.js";
import { UnauthorizedStatusChangeError } from "../errors/unauthorized-status-change-error.js";
import { OrderNotCancellableError } from "../errors/order-not-cancellable-error.js";
import { OrderNotModifiableError } from "../errors/order-not-modifiable-error.js";

/** Roles that can perform actions on orders. */
export type ActorRole = "client" | "staff" | "administrator";

/** The user performing an action, used for permission checks and status history. */
export interface Actor {
  /** Identifier of the user performing the action. */
  id: string;
  /** Role of the user; determines what they are allowed to do. */
  role: ActorRole;
}

/** Data required to create a new order. */
export interface CreateOrderInput {
  /** Identifier of the client placing the order. */
  clientId: string;
  /** Date and time the client wants the order to be ready. */
  scheduleTime: Date;
  /** General notes about the order. */
  notes: string;
  /** Whether the order is delivered to the client or picked up. */
  fulfillmentType: FulfillmentType;
  /** Delivery address. Required when `fulfillmentType` is `"delivery"`. */
  deliveryAddress?: string;
  /** Extra delivery instructions (e.g. "ring the bell"). */
  deliveryNotes?: string;
  /** Who provides the courier. Required when `fulfillmentType` is `"delivery"`. */
  deliveryMode?: DeliveryMode;
  /** Delivery cost. Defaults to 0 for delivery orders; ignored for pickup. */
  deliveryFee?: number;
  /** Order lines. At least one is required. `id` and `orderId` are generated here. */
  details: Omit<OrderDetail, "id" | "orderId">[];
}

/**
 * Valid status progression. Each status can only advance to the next one.
 */
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  received: "in_preparation",
  in_preparation: "ready",
  ready: "delivered",
};

/** Statuses that are final: the order is part of the history and cannot change. */
const CLOSED_STATUSES: OrderStatus[] = ["delivered", "cancelled"];

/**
 * Application service that handles the order lifecycle: creation,
 * status changes, cancellation and queries.
 */
export class OrderService {
  /**
   * @param orders - Persistence port for orders.
   * @param minAdvanceMinutes - Minimum minutes between now and the scheduled
   * time (RN-11). Defaults to 10 and is configurable.
   */
  constructor(
    private readonly orders: OrderRepository,
    private readonly minAdvanceMinutes: number = 10,
  ) {}

  /**
   * Creates a new order in the `received` status, together with its lines
   * and its first status history entry.
   *
   * The order total is the sum of `price * quantity` of every line, plus the
   * delivery fee for delivery orders.
   *
   * @param input - Data of the order to create.
   * @returns The persisted order.
   * @throws {EmptyOrderError} If there are no order lines (RN-09).
   * @throws {MissingDeliveryInfoError} If a delivery order lacks its address or delivery mode (RN-10).
   * @throws {InvalidScheduleTimeError} If the scheduled time is in the past or too soon (RN-11).
   */
  async createOrder(input: CreateOrderInput): Promise<Order> {
    // RN-09
    if (input.details.length === 0) {
      throw new EmptyOrderError();
    }

    // RN-10
    if (input.fulfillmentType === "delivery") {
      const missing: string[] = [];
      if (!input.deliveryAddress?.trim()) missing.push("deliveryAddress");
      if (!input.deliveryMode) missing.push("deliveryMode");
      if (missing.length > 0) {
        throw new MissingDeliveryInfoError(missing);
      }
    }

    // RN-11
    const earliest = Date.now() + this.minAdvanceMinutes * 60_000;
    if (input.scheduleTime.getTime() < earliest) {
      throw new InvalidScheduleTimeError(this.minAdvanceMinutes);
    }

    const isDelivery = input.fulfillmentType === "delivery";
    const deliveryFee = isDelivery ? (input.deliveryFee ?? 0) : undefined;
    const now = new Date();
    const orderId = randomUUID();

    const details: OrderDetail[] = input.details.map((detail) => ({
      ...detail,
      id: randomUUID(),
      orderId,
    }));

    const itemsTotal = details.reduce((sum, d) => sum + d.price * d.quantity, 0);

    const order: Order = {
      id: orderId,
      idClient: input.clientId,
      scheduleTime: input.scheduleTime,
      createdAt: now,
      notes: input.notes,
      total: itemsTotal + (deliveryFee ?? 0),
      status: "received",
      fulfillmentType: input.fulfillmentType,
      ...(isDelivery && {
        deliveryAddress: input.deliveryAddress,
        deliveryNotes: input.deliveryNotes,
        deliveryMode: input.deliveryMode,
        deliveryFee,
      }),
    };

    const history: OrderStatusHistory = {
      id: randomUUID(),
      orderId,
      changedById: input.clientId,
      status: "received",
      changedAt: now,
    };

    return this.orders.createWithDetails(order, details, history);
  }

  /**
   * Moves an order to a new status and records the change in its history.
   *
   * Statuses can only advance one step at a time (received, in preparation,
   * ready, delivered). Requesting `"cancelled"` delegates to the
   * cancellation rules.
   *
   * @param orderId - Identifier of the order.
   * @param newStatus - The requested status.
   * @param actor - The user requesting the change.
   * @throws {UnauthorizedStatusChangeError} If the actor is a client (RN-13).
   * @throws {OrderNotModifiableError} If the order is already delivered or cancelled (RN-15).
   * @throws {InvalidStatusTransitionError} If the change skips a step or goes backwards (RN-12).
   * @throws {OrderNotCancellableError} If cancelling an order that is no longer `received` (RN-14).
   * @throws {Error} If the order doesn't exist.
   */
  async changeStatus(orderId: string, newStatus: OrderStatus, actor: Actor): Promise<void> {
    // RN-13
    this.assertCanChangeStatus(actor);

    const order = await this.getExistingOrder(orderId);

    // RN-15
    if (CLOSED_STATUSES.includes(order.status)) {
      throw new OrderNotModifiableError(order.status);
    }

    // Cancelling has its own rule (RN-14)
    if (newStatus === "cancelled") {
      return this.cancelExisting(order, actor);
    }

    // RN-12
    if (NEXT_STATUS[order.status] !== newStatus) {
      throw new InvalidStatusTransitionError(order.status, newStatus);
    }

    await this.orders.updateStatus(orderId, this.buildHistory(orderId, newStatus, actor));
  }

  /**
   * Cancels an order. Only allowed while the order is in the `received` status.
   *
   * @param orderId - Identifier of the order.
   * @param actor - The user requesting the cancellation.
   * @throws {UnauthorizedStatusChangeError} If the actor is a client (RN-13).
   * @throws {OrderNotModifiableError} If the order is already cancelled (RN-15).
   * @throws {OrderNotCancellableError} If the order is in preparation, ready or delivered (RN-14).
   * @throws {Error} If the order doesn't exist.
   */
  async cancelOrder(orderId: string, actor: Actor): Promise<void> {
    this.assertCanChangeStatus(actor);

    const order = await this.getExistingOrder(orderId);

    if (order.status === "cancelled") {
      throw new OrderNotModifiableError(order.status);
    }

    await this.cancelExisting(order, actor);
  }

  /**
   * Gets an order, including its current status (RN-16).
   *
   * @param orderId - Identifier of the order.
   * @throws {Error} If the order doesn't exist.
   */
  async getOrder(orderId: string): Promise<Order> {
    return this.getExistingOrder(orderId);
  }

  /**
   * Lists all the orders of a client.
   *
   * @param clientId - Identifier of the client.
   */
  async listByClient(clientId: string): Promise<Order[]> {
    return this.orders.findByClient(clientId);
  }

  /**
   * Lists all the orders currently in the given status.
   *
   * @param status - Status to filter by.
   */
  async listByStatus(status: OrderStatus): Promise<Order[]> {
    return this.orders.findByStatus(status);
  }

  /**
   * Gets the full status change history of an order.
   *
   * @param orderId - Identifier of the order.
   */
  async getStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    return this.orders.findStatusHistory(orderId);
  }

  /**
   * Cancels an already loaded order after checking it is still `received` (RN-14).
   *
   * @throws {OrderNotCancellableError} If the order is not in `received` status.
   */
  private async cancelExisting(order: Order, actor: Actor): Promise<void> {
    if (order.status !== "received") {
      throw new OrderNotCancellableError(order.status);
    }

    await this.orders.updateStatus(order.id, this.buildHistory(order.id, "cancelled", actor));
  }

  /**
   * Ensures the actor is allowed to change order statuses (RN-13).
   *
   * @throws {UnauthorizedStatusChangeError} If the actor is a client.
   */
  private assertCanChangeStatus(actor: Actor): void {
    if (actor.role === "client") {
      throw new UnauthorizedStatusChangeError();
    }
  }

  /**
   * Loads an order or fails if it doesn't exist.
   *
   * @throws {Error} If the order doesn't exist.
   */
  private async getExistingOrder(orderId: string): Promise<Order> {
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} doesn't exist`);
    }
    return order;
  }

  /** Builds a status history entry for a change made by the given actor. */
  private buildHistory(orderId: string, status: OrderStatus, actor: Actor): OrderStatusHistory {
    return {
      id: randomUUID(),
      orderId,
      changedById: actor.id,
      status,
      changedAt: new Date(),
    };
  }
}