import { InvalidInputError } from "../../shared/invalid-input-error";
import { normalizeText } from "../../shared/normalize-text";
import { NotFoundError } from "../../shared/not-found-error";
import { Drink } from "../../menu/domain/entities/drink.entity";
import { Extra } from "../../menu/domain/entities/extra.entity";
import { MilkType } from "../../menu/domain/entities/milk-type.entity";
import { Size } from "../../menu/domain/entities/size.entity";
import { Sweetener } from "../../menu/domain/entities/sweetener.entity";
import { DrinkWithPrice } from "../../menu/domain/models/drink-with-price";
import { ExtraQuantityExceededError } from "../../menu/domain/errors";
import { MAX_EXTRA_QUANTITY } from "../../menu/domain/limits";
import { assertIntegerInRange, assertNoRepeats, assertValidTotalPrice } from "../../menu/domain/validation";
import { Fulfillment } from "./entities/fulfillment.entity";
import { OrderDetail } from "./entities/order-detail.entity";
import { OrderStatus } from "./entities/order.entity";
import { DrinkConfiguration } from "./entities/product-configuration.entity";
import {
    EmptyOrderError, InvalidStatusTransitionError, MilkRequiredError,
    OptionNotAllowedForDrinkError, OrderTotalOutOfRangeError,
} from "./errors";
import {
    DELIVERY_ADDRESS_MAX_LENGTH, DELIVERY_FEE_MAX_CENTS, ITEM_QUANTITY_MAX, ORDER_ITEMS_MAX,
    ORDER_TOTAL_MAX_CENTS, SCHEDULE_MAX_DAYS_AHEAD, SCHEDULE_MIN_LEAD_MINUTES,
} from "./limits";
import { FulfillmentInput } from "./models/order-inputs";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Optional text: blank means "none"; anything else is cleaned and checked like any other text. */
export function cleanOptionalText(field: string, value: string | undefined, maxLength: number): string | undefined {
    if (value === undefined || value.trim() === "") {
        return undefined;
    }
    return normalizeText(field, value, maxLength);
}

export function assertItemsCount(count: number): void {
    if (count === 0) {
        throw new EmptyOrderError();
    }
    if (count > ORDER_ITEMS_MAX) {
        throw new InvalidInputError("items", `cannot have more than ${ORDER_ITEMS_MAX} lines`);
    }
}

export function assertItemQuantity(quantity: number): void {
    assertIntegerInRange("quantity", quantity, 1, ITEM_QUANTITY_MAX);
}

/** Provisional: until Location has opening hours, only the lead time and the days ahead are checked. */
export function assertScheduleTime(scheduleTime: Date, now: Date): void {
    if (!(scheduleTime instanceof Date) || Number.isNaN(scheduleTime.getTime())) {
        throw new InvalidInputError("scheduleTime", "must be a valid date");
    }
    if (scheduleTime.getTime() < now.getTime() + SCHEDULE_MIN_LEAD_MINUTES * MINUTE_MS) {
        throw new InvalidInputError("scheduleTime", `must be at least ${SCHEDULE_MIN_LEAD_MINUTES} minutes from now`);
    }
    if (scheduleTime.getTime() > now.getTime() + SCHEDULE_MAX_DAYS_AHEAD * DAY_MS) {
        throw new InvalidInputError("scheduleTime", `cannot be more than ${SCHEDULE_MAX_DAYS_AHEAD} days ahead`);
    }
}

/** Pickup carries nothing else. Delivery needs an address, who brings it, and a fee. Returns the checked fulfillment. */
export function buildFulfillment(input: FulfillmentInput): Fulfillment {
    if (input.fulfillmentType === "pickup") {
        return { fulfillmentType: "pickup" };
    }

    if (input.fulfillmentType === "delivery") {
        const deliveryAddress = normalizeText("deliveryAddress", input.deliveryAddress, DELIVERY_ADDRESS_MAX_LENGTH);
        if (input.deliveryMode !== "own" && input.deliveryMode !== "third_party") {
            throw new InvalidInputError("deliveryMode", 'must be "own" or "third_party"');
        }
        assertIntegerInRange("deliveryFeeCents", input.deliveryFeeCents, 0, DELIVERY_FEE_MAX_CENTS);

        return { fulfillmentType: "delivery", deliveryAddress, deliveryMode: input.deliveryMode, deliveryFeeCents: input.deliveryFeeCents };
    }

    throw new InvalidInputError("fulfillmentType", 'must be "pickup" or "delivery"');
}

/**
 * Checks the configuration only against what the DRINK offers (ids and quantities); that each
 * option exists and is active is the service's job. Extras list only what the client ADDS:
 * the included units come with the drink and are not sent.
 */
export function assertConfigurationOffered(drink: Drink, config: DrinkConfiguration): void {
    assertNoRepeats("extras", config.extras.map((e) => e.extraId));

    if (!drink.allowedSizeIds.includes(config.sizeId)) {
        throw new OptionNotAllowedForDrinkError("Size", config.sizeId, drink.id);
    }

    if (drink.allowedMilkTypeIds.length === 0) {
        if (config.milkTypeId !== undefined) {
            throw new OptionNotAllowedForDrinkError("MilkType", config.milkTypeId, drink.id);
        }
    } else {
        if (config.milkTypeId === undefined) {
            throw new MilkRequiredError(drink.id);
        }
        if (!drink.allowedMilkTypeIds.includes(config.milkTypeId)) {
            throw new OptionNotAllowedForDrinkError("MilkType", config.milkTypeId, drink.id);
        }
    }

    if (config.sweetenerId !== undefined && !drink.allowedSweetenerIds.includes(config.sweetenerId)) {
        throw new OptionNotAllowedForDrinkError("Sweetener", config.sweetenerId, drink.id);
    }

    for (const item of config.extras) {
        assertIntegerInRange("extras.addedQuantity", item.addedQuantity, 1, MAX_EXTRA_QUANTITY);
        if (!drink.extras.some((e) => e.extraId === item.extraId)) {
            throw new OptionNotAllowedForDrinkError("Extra", item.extraId, drink.id);
        }
    }
}

/** The options of one configuration, already loaded and checked as active by the service. */
export interface ChosenOptions {
    size: Size;
    milkType?: MilkType;
    sweetener?: Sweetener;
    /** Every extra named in the configuration, by id. */
    extras: Map<string, Extra>;
}

/**
 * The price of ONE unit: drink + size + milk + sweetener + the extra units the client adds.
 * The included units cost nothing: they are already part of the drink's price.
 * `drink.priceCents` already holds type + flavor (see MenuService), so it is not worked out again here.
 */
export function calculateUnitPriceCents(drink: DrinkWithPrice, config: DrinkConfiguration, chosen: ChosenOptions): number {
    let price = drink.priceCents + chosen.size.priceCents + (chosen.milkType?.priceCents ?? 0) + (chosen.sweetener?.priceCents ?? 0);

    for (const item of config.extras) {
        const extra = chosen.extras.get(item.extraId);
        if (!extra) {
            throw new NotFoundError("Extra", item.extraId);
        }
        const included = drink.extras.find((e) => e.extraId === item.extraId)?.includedQuantity ?? 0;
        // the limit counts everything the drink ends up with: included + added
        if (included + item.addedQuantity > extra.maxQuantity) {
            throw new ExtraQuantityExceededError(extra.id, included + item.addedQuantity, extra.maxQuantity);
        }
        price += item.addedQuantity * extra.priceCents;
    }

    assertValidTotalPrice(price);
    return price;
}

/** Items + delivery fee, before any loyalty redemption. Must be above zero and within the limit. */
export function calculateTotalCents(items: readonly OrderDetail[], deliveryFeeCents: number): number {
    const total = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0) + deliveryFeeCents;

    if (!Number.isInteger(total) || total <= 0 || total > ORDER_TOTAL_MAX_CENTS) {
        throw new OrderTotalOutOfRangeError(total);
    }
    return total;
}

const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
    pending: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
};

/** The status only moves forward one step at a time; cancelling is allowed until delivery. */
export function assertStatusTransition(orderId: string, from: OrderStatus, to: OrderStatus): void {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new InvalidStatusTransitionError(orderId, from, to);
    }
}