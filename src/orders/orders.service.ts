import { randomUUID } from "crypto"
import { Order, LoyaltyRedemption } from "./domain/entities/order.entity"
import { OrderDetail } from "./domain/entities/order-detail.entity"
import { OrderRepository } from "./domain/repositories/order.repository"
import { CreateOrderInput, LoyaltyRedemptionInput, OrderItemInput } from "./domain/models/order-inputs"
import { DrinkNotAvailableError } from "./domain/errors"
import { ORDER_NOTES_MAX_LENGTH } from "./domain/limits"
import {
    assertConfigurationOffered, assertItemQuantity, assertItemsCount, assertScheduleTime, assertStatusTransition,
    buildFulfillment, calculateTotalCents, calculateUnitPriceCents, ChosenOptions, cleanOptionalText,
} from "./domain/validation"
import { MenuService } from "../menu/menu.service"
import { SizeRepository } from "../menu/domain/repositories/size.repository"
import { MilkTypeRepository } from "../menu/domain/repositories/milk-type.repository"
import { SweetenerRepository } from "../menu/domain/repositories/sweetener.repository"
import { ExtraRepository } from "../menu/domain/repositories/extra.repository"
import { Extra } from "../menu/domain/entities/extra.entity"
import { InactiveOptionError } from "../menu/domain/errors"
import { LoyaltyService } from "../loyalty/loyalty.service"
import { UserService } from "../user/user.service"
import { InactiveStaffError } from "../user/domain/errors"
import { User } from "../user/domain/entities/user.entity"
import { LocationService } from "../location/location.service"
import { Clock } from "../shared/clock"
import { InvalidInputError } from "../shared/invalid-input-error"
import { NotFoundError } from "../shared/not-found-error"
import { UnauthorizedActionError } from "../shared/unauthorized-action-error"

export class OrderService {
    constructor(
        private readonly orders: OrderRepository,
        private readonly menu: MenuService,
        // read-only: Orders never changes the catalogs, it only prices from them
        private readonly sizes: SizeRepository,
        private readonly milkTypes: MilkTypeRepository,
        private readonly sweeteners: SweetenerRepository,
        private readonly extras: ExtraRepository,
        private readonly loyalty: LoyaltyService,
        private readonly users: UserService,
        private readonly locations: LocationService,
        private readonly clock: Clock,
    ) { }

    /** -------------------------------------------- CREATE -------------------------------------------- */

    /**
     * The client makes their own order (an administrator can make it for them). Prices are never
     * received: each line is priced from the menu and kept as a snapshot. The order starts "pending".
     * If a loyalty redemption is asked for, it is taken last, once everything else is valid.
     */
    async createOrder(actorId: string, input: CreateOrderInput): Promise<Order> {
        const actor = await this.users.getUser(actorId);
        if (actor.role === "staff" || (actor.role === "client" && actor.id !== input.clientId)) {
            throw new UnauthorizedActionError("create this order");
        }
        await this.users.getClient(input.clientId);
        await this.locations.getLocation(input.locationId);

        const now = this.clock.now();
        assertScheduleTime(input.scheduleTime, now);
        const notes = cleanOptionalText("notes", input.notes, ORDER_NOTES_MAX_LENGTH);
        const fulfillment = buildFulfillment(input.fulfillment);

        assertItemsCount(input.items.length);
        const items: OrderDetail[] = [];
        for (const item of input.items) {
            items.push(await this.buildItem(item));
        }
        const deliveryFeeCents = fulfillment.fulfillmentType === "delivery" ? fulfillment.deliveryFeeCents : 0;
        const totalCents = calculateTotalCents(items, deliveryFeeCents);

        // TODO(payment): once the Payment module exists, the order starts with nothing paid
        // and Orders decides when the sum of confirmed payments covers totalCents - loyalty coveredCents.

        const loyaltyRedemption = await this.redeemLoyalty(input.clientId, input.loyalty, items, totalCents);

        const order: Order = {
            id: randomUUID(),
            clientId: input.clientId,
            locationId: input.locationId,
            status: "pending",
            scheduleTime: new Date(input.scheduleTime),
            notes,
            items,
            totalCents,
            loyaltyRedemption,
            createdAt: now,
            updatedAt: now,
            ...fulfillment,
        };

        try {
            return await this.orders.save(order);
        } catch (error) {
            // the order was not stored, so what loyalty took must go back
            if (loyaltyRedemption) {
                await this.loyalty.refund({ clientId: input.clientId, amount: loyaltyRedemption.amount });
            }
            throw error;
        }
    }

    /** -------------------------------------------- STATUS -------------------------------------------- */
    // Staff of the order's location (or an administrator) move the order forward.

    startPreparing(actorId: string, orderId: string): Promise<Order> {
        return this.changeStatus(actorId, orderId, "preparing", "prepare orders");
    }

    markReady(actorId: string, orderId: string): Promise<Order> {
        return this.changeStatus(actorId, orderId, "ready", "mark orders as ready");
    }

    /**
     * Delivering is what makes the order earn loyalty. The status is saved first, so the earning
     * can only happen once (a delivered order cannot be delivered again).
     */
    async markDelivered(actorId: string, orderId: string): Promise<Order> {
        const delivered = await this.changeStatus(actorId, orderId, "delivered", "deliver orders");

        // loyalty only counts money really paid: what a redemption covered is left out
        await this.loyalty.earnForOrder({
            orderId: delivered.id,
            clientId: delivered.clientId,
            isDelivered: true,
            amountPaidCents: delivered.totalCents - (delivered.loyaltyRedemption?.coveredCents ?? 0),
        });
        return delivered;
    }

    /**
     * The client can cancel their own order only while it is "pending"; staff of the location
     * and administrators can cancel until it is delivered. What loyalty took is given back, once.
     */
    async cancelOrder(actorId: string, orderId: string): Promise<Order> {
        const order = await this.findOrder(orderId);
        const actor = await this.users.getUser(actorId);
        assertStatusTransition(order.id, order.status, "cancelled");

        if (actor.role === "client") {
            if (actor.id !== order.clientId) {
                throw new UnauthorizedActionError("cancel this order");
            }
            if (order.status !== "pending") {
                throw new UnauthorizedActionError("cancel an order that is already being prepared");
            }
        } else {
            this.assertStaffOrAdministrator(actor, order.locationId, "cancel orders");
        }

        const cancelled = await this.orders.save({ ...order, status: "cancelled", updatedAt: this.clock.now() });

        // TODO(payment): refund the confirmed payments of this order.
        if (cancelled.loyaltyRedemption) {
            await this.loyalty.refund({ clientId: cancelled.clientId, amount: cancelled.loyaltyRedemption.amount });
        }
        return cancelled;
    }

    /** -------------------------------------------- READ -------------------------------------------- */

    /** The client who made it, staff of its location, or an administrator. */
    async getOrder(actorId: string, orderId: string): Promise<Order> {
        const order = await this.findOrder(orderId);
        const actor = await this.users.getUser(actorId);

        if (!(actor.role === "client" && actor.id === order.clientId)) {
            this.assertStaffOrAdministrator(actor, order.locationId, "view this order");
        }
        return order;
    }

    /** A client sees their own orders; an administrator sees anyone's. */
    async listClientOrders(actorId: string, clientId: string): Promise<Order[]> {
        const actor = await this.users.getUser(actorId);
        if (actor.role === "staff" || (actor.role === "client" && actor.id !== clientId)) {
            throw new UnauthorizedActionError("view these orders");
        }
        return this.orders.findByClientId(clientId);
    }

    /** Staff of that location, or an administrator. */
    async listLocationOrders(actorId: string, locationId: string): Promise<Order[]> {
        const actor = await this.users.getUser(actorId);
        this.assertStaffOrAdministrator(actor, locationId, "view the orders of this location");
        return this.orders.findByLocationId(locationId);
    }

    /** -------------------------------------------- HELPERS -------------------------------------------- */

    private async findOrder(orderId: string): Promise<Order> {
        const order = await this.orders.findById(orderId);
        if (!order) {
            throw new NotFoundError("Order", orderId);
        }
        return order;
    }

    private async changeStatus(actorId: string, orderId: string, to: Order["status"], action: string): Promise<Order> {
        const order = await this.findOrder(orderId);
        const actor = await this.users.getUser(actorId);
        this.assertStaffOrAdministrator(actor, order.locationId, action);
        assertStatusTransition(order.id, order.status, to);

        return this.orders.save({ ...order, status: to, updatedAt: this.clock.now() });
    }

    /** Staff only act on their own location, and only while active. */
    private assertStaffOrAdministrator(actor: User, locationId: string, action: string): void {
        if (actor.role === "administrator") {
            return;
        }
        if (actor.role === "staff" && actor.locationId === locationId) {
            if (!actor.isActive) {
                throw new InactiveStaffError(actor.id);
            }
            return;
        }
        throw new UnauthorizedActionError(action);
    }

    /** Checks one line against the menu and prices it. Only drinks exist today. */
    private async buildItem(input: OrderItemInput): Promise<OrderDetail> {
        assertItemQuantity(input.quantity);
        const config = input.configuration;
        if (config.kind !== "drink") {
            throw new InvalidInputError("configuration.kind", 'must be "drink"');
        }
        const notes = cleanOptionalText("notes", config.notes, ORDER_NOTES_MAX_LENGTH);

        const drink = await this.menu.getDrink(config.drinkId);
        if (!drink.isAvailable) {
            throw new DrinkNotAvailableError(drink.id);
        }
        assertConfigurationOffered(drink, config);
        const chosen = await this.loadChosenOptions(config);

        return {
            configuration: { ...config, notes, extras: config.extras.map((e) => ({ ...e })) },
            quantity: input.quantity,
            unitPriceCents: calculateUnitPriceCents(drink, config, chosen),
        };
    }

    /** Every option the client picked must exist and be active. */
    private async loadChosenOptions(config: { sizeId: string; milkTypeId?: string; sweetenerId?: string; extras: { extraId: string }[] }): Promise<ChosenOptions> {
        const size = await this.requireActive(this.sizes, "Size", config.sizeId);
        const milkType = config.milkTypeId === undefined ? undefined : await this.requireActive(this.milkTypes, "MilkType", config.milkTypeId);
        const sweetener = config.sweetenerId === undefined ? undefined : await this.requireActive(this.sweeteners, "Sweetener", config.sweetenerId);

        const extras = new Map<string, Extra>();
        for (const item of config.extras) {
            extras.set(item.extraId, await this.requireActive(this.extras, "Extra", item.extraId));
        }
        return { size, milkType, sweetener, extras };
    }

    /**
     * At most one redemption per order. Loyalty decides if it is valid (active program, enough balance,
     * right mode); its errors go up as they are. Returns what the order must remember to refund it.
     */
    private async redeemLoyalty(
        clientId: string, redemption: LoyaltyRedemptionInput | undefined, items: OrderDetail[], totalCents: number,
    ): Promise<LoyaltyRedemption | undefined> {
        if (!redemption) {
            return undefined;
        }

        if (redemption.mode === "free_item") {
            const item = items[redemption.itemIndex];
            if (!Number.isInteger(redemption.itemIndex) || !item) {
                throw new InvalidInputError("loyalty.itemIndex", `must be a line of the order, from 0 to ${items.length - 1}`);
            }
            const change = await this.loyalty.redeemReward({ clientId });
            return { amount: -change.amount, coveredCents: item.unitPriceCents };
        }

        if (redemption.mode === "account_balance") {
            const change = await this.loyalty.redeemBalance({ clientId, amountCents: redemption.amountCents, orderTotalCents: totalCents });
            return { amount: -change.amount, coveredCents: redemption.amountCents };
        }

        throw new InvalidInputError("loyalty.mode", 'must be "free_item" or "account_balance"');
    }

    /** Finds a record that must exist AND be active (the same rule the menu uses for its own records). */
    private async requireActive<T extends { id: string; isActive: boolean }>(
        repository: { findById(id: string): Promise<T | null> },
        entityName: string,
        id: string,
    ): Promise<T> {
        const entity = await repository.findById(id);
        if (!entity) {
            throw new NotFoundError(entityName, id);
        }
        if (!entity.isActive) {
            throw new InactiveOptionError(entityName, id);
        }
        return entity;
    }
}