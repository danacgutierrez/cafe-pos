import assert from "node:assert/strict";
import { NotFoundError } from "../shared/not-found-error";
import { UnauthorizedActionError } from "../shared/unauthorized-action-error";
import { ExtraQuantityExceededError, InactiveOptionError } from "../menu/domain/errors";
import { InactiveStaffError } from "../user/domain/errors";
import { LocationInUseError } from "../location/domain/errors";
import { CreateProgramInput } from "../loyalty/domain/models/loyalty-inputs";
import {
    BalanceExceedsOrderTotalError, InsufficientBalanceError, NoActiveProgramError, RedeemModeMismatchError,
} from "../loyalty/domain/errors";
import {
    DrinkNotAvailableError, EmptyOrderError, InvalidStatusTransitionError, MilkRequiredError, OptionNotAllowedForDrinkError,
} from "../orders/domain/errors";
import { DELIVERY_FEE_MAX_CENTS, ITEM_QUANTITY_MAX, ORDER_ITEMS_MAX, ORDER_NOTES_MAX_LENGTH } from "../orders/domain/limits";
import { expectInvalidField, expectRejected } from "./helpers";
import { Scenario } from "./scenario";
import {
    basicDrinkInput, buildOrders, clientInput, drinkItem, hoursFromNow, OrdersKit, OrdersSeed, orderInput, PASSWORD,
    seedOrders, visitProgramInput, walletProgramInput,
} from "./setup";

/** A pickup order of one plain drink (5000 cents) made by the seeded client. */
function placeOrder(kit: OrdersKit, seed: OrdersSeed, overrides: Parameters<typeof orderInput>[2] = {}) {
    return kit.orders.createOrder(seed.client.id, orderInput(kit, seed, overrides));
}

/** Everything seeded, and the given loyalty program already active (none if omitted). */
async function ordersWorld(program?: CreateProgramInput) {
    const kit = buildOrders();
    const seed = await seedOrders(kit);
    if (program) {
        const created = await kit.loyalty.createProgram(seed.admin.id, program);
        await kit.loyalty.activateProgram(seed.admin.id, created.id);
    }
    return { kit, seed };
}

async function giveBalance(kit: OrdersKit, seed: OrdersSeed, amount: number) {
    await kit.loyalty.adjustBalance(seed.admin.id, { clientId: seed.client.id, amount });
}

const balanceOf = (kit: OrdersKit, seed: OrdersSeed) => kit.loyalty.getBalance(seed.client.id);

/** The staff member walks the order all the way to delivered. */
async function deliver(kit: OrdersKit, seed: OrdersSeed, orderId: string) {
    await kit.orders.startPreparing(seed.staff.id, orderId);
    await kit.orders.markReady(seed.staff.id, orderId);
    return kit.orders.markDelivered(seed.staff.id, orderId);
}

async function assertNoOrdersSaved(kit: OrdersKit) {
    assert.equal((await kit.orderRepository.findAll()).length, 0, "no order should have been saved");
}

export const ordersScenarios: Scenario[] = [
    {
        title: "A client orders a customized drink for delivery; every price comes from the menu",
        kind: "works",
        main: true,
        async run() {
            const kit = buildOrders();
            const seed = await seedOrders(kit);
            const { catalog } = seed;

            const order = await kit.orders.createOrder(seed.client.id, orderInput(kit, seed, {
                notes: "  Ring   the bell ",
                items: [drinkItem(seed, {
                    sizeId: catalog.large.id,
                    milkTypeId: catalog.oatMilk.id,
                    sweetenerId: catalog.extraSweet.id,
                    // cold foam: 1 included + 1 added = 2 (its maximum); the espresso shot is not included
                    extras: [{ extraId: catalog.coldFoam.id, addedQuantity: 1 }, { extraId: catalog.espressoShot.id, addedQuantity: 1 }],
                    notes: " less   ice ",
                }, 2)],
                fulfillment: { fulfillmentType: "delivery", deliveryAddress: "Calle 5 #100", deliveryMode: "own", deliveryFeeCents: 3000 },
            }));

            // drink 5000 + large 1000 + oat 1500 + extra sweet 300 + cold foam 1200 + espresso 1500
            assert.equal(order.items[0]?.unitPriceCents, 10500);
            assert.equal(order.totalCents, 2 * 10500 + 3000);
            assert.equal(order.status, "pending");
            assert.equal(order.notes, "Ring the bell");
            assert.equal(order.items[0]?.configuration.notes, "less ice");
            assert.ok(order.fulfillmentType === "delivery");
            assert.equal(order.deliveryMode, "own");
            assert.equal(order.deliveryFeeCents, 3000);
            console.log("  OK: unit", order.items[0]?.unitPriceCents, "- total", order.totalCents, "-", order.status);
        },
    },
    {
        title: "A pickup order of the drink as it comes: the included cold foam costs nothing and no delivery data is kept",
        kind: "works",
        async run() {
            const { kit, seed } = await ordersWorld();

            const order = await placeOrder(kit, seed);

            assert.equal(order.items[0]?.unitPriceCents, 5000);
            assert.equal(order.totalCents, 5000);
            assert.equal(order.fulfillmentType, "pickup");
            assert.equal("deliveryAddress" in order, false);
            assert.equal(order.loyaltyRedemption, undefined);
            console.log("  OK: total", order.totalCents);
        },
    },
    {
        title: "A configuration the drink does not offer is rejected",
        kind: "rejected",
        main: true,
        async run() {
            const { kit, seed } = await ordersWorld();
            const { catalog } = seed;
            const almond = await kit.options.createMilkType("Almond milk", 1500);
            const medium = await kit.options.createSize("Medium", 500);
            const mediumSweet = await kit.options.createSweetener("Medium", 2, 100);
            const syrup = await kit.options.createExtra("Syrup", 800, 2);
            const plainFlavor = await kit.options.createDrinkFlavor("Plain", 0);
            const plain = await kit.menu.createDrink(basicDrinkInput(catalog, { name: "Plain matcha", drinkFlavorId: plainFlavor.id }));
            const order = (item: ReturnType<typeof drinkItem>) => () => placeOrder(kit, seed, { items: [item] });

            await expectRejected(order(drinkItem(seed, { milkTypeId: undefined })), MilkRequiredError);
            await expectRejected(order(drinkItem(seed, { milkTypeId: almond.id })), OptionNotAllowedForDrinkError);
            await expectRejected(order(drinkItem(seed, { sizeId: medium.id })), OptionNotAllowedForDrinkError);
            await expectRejected(order(drinkItem(seed, { sweetenerId: mediumSweet.id })), OptionNotAllowedForDrinkError);
            await expectRejected(order(drinkItem(seed, { extras: [{ extraId: syrup.id, addedQuantity: 1 }] })), OptionNotAllowedForDrinkError);
            await expectRejected(order(drinkItem(seed, { drinkId: plain.id, milkTypeId: catalog.wholeMilk.id })), OptionNotAllowedForDrinkError);
            // cold foam: 1 included + 2 added = 3, above its maximum of 2
            await expectRejected(order(drinkItem(seed, { extras: [{ extraId: catalog.coldFoam.id, addedQuantity: 2 }] })), ExtraQuantityExceededError);
            await expectInvalidField(order(drinkItem(seed, { extras: [{ extraId: catalog.coldFoam.id, addedQuantity: 0 }] })), "extras.addedQuantity");
            await expectInvalidField(order(drinkItem(seed, {
                extras: [{ extraId: catalog.coldFoam.id, addedQuantity: 1 }, { extraId: catalog.coldFoam.id, addedQuantity: 1 }],
            })), "extras");

            await assertNoOrdersSaved(kit);
            console.log("  OK: nine invalid configurations rejected, nothing saved");
        },
    },
    {
        title: "Turned-off options, unavailable drinks and unknown drinks cannot be ordered",
        kind: "rejected",
        async run() {
            const { kit, seed } = await ordersWorld();
            const { catalog } = seed;
            const order = (item: ReturnType<typeof drinkItem>) => () => placeOrder(kit, seed, { items: [item] });

            await kit.options.deactivateSize(catalog.large.id);
            await kit.options.deactivateMilkType(catalog.oatMilk.id);
            await expectRejected(order(drinkItem(seed, { sizeId: catalog.large.id })), InactiveOptionError);
            await expectRejected(order(drinkItem(seed, { milkTypeId: catalog.oatMilk.id })), InactiveOptionError);

            await kit.menu.deactivateDrink(seed.drink.id);
            await expectRejected(order(drinkItem(seed)), DrinkNotAvailableError);
            await expectRejected(order(drinkItem(seed, { drinkId: "does-not-exist" })), NotFoundError);

            await assertNoOrdersSaved(kit);
            console.log("  OK: inactive size, inactive milk, inactive drink and unknown drink rejected");
        },
    },
    {
        title: "Invalid order data is rejected: items, quantities, schedule, delivery and notes",
        kind: "rejected",
        async run() {
            const { kit, seed } = await ordersWorld();
            const delivery = (overrides: object) => ({
                fulfillmentType: "delivery" as const, deliveryAddress: "Calle 5 #100", deliveryMode: "own" as const, deliveryFeeCents: 0, ...overrides,
            });
            const minutes = (m: number) => new Date(kit.clock.now().getTime() + m * 60_000);

            await expectRejected(() => placeOrder(kit, seed, { items: [] }), EmptyOrderError);
            await expectInvalidField(() => placeOrder(kit, seed, { items: Array.from({ length: ORDER_ITEMS_MAX + 1 }, () => drinkItem(seed)) }), "items");
            await expectInvalidField(() => placeOrder(kit, seed, { items: [drinkItem(seed, {}, 0)] }), "quantity");
            await expectInvalidField(() => placeOrder(kit, seed, { items: [drinkItem(seed, {}, ITEM_QUANTITY_MAX + 1)] }), "quantity");

            await expectInvalidField(() => placeOrder(kit, seed, { scheduleTime: hoursFromNow(kit, -1) }), "scheduleTime");
            await expectInvalidField(() => placeOrder(kit, seed, { scheduleTime: minutes(5) }), "scheduleTime");
            await expectInvalidField(() => placeOrder(kit, seed, { scheduleTime: hoursFromNow(kit, 24 * 8) }), "scheduleTime");
            await expectInvalidField(() => placeOrder(kit, seed, { scheduleTime: new Date("not a date") }), "scheduleTime");

            await expectInvalidField(() => placeOrder(kit, seed, { fulfillment: delivery({ deliveryAddress: "   " }) }), "deliveryAddress");
            await expectInvalidField(() => placeOrder(kit, seed, { fulfillment: delivery({ deliveryMode: "bike" }) }), "deliveryMode");
            await expectInvalidField(() => placeOrder(kit, seed, { fulfillment: delivery({ deliveryFeeCents: -1 }) }), "deliveryFeeCents");
            await expectInvalidField(() => placeOrder(kit, seed, { fulfillment: delivery({ deliveryFeeCents: DELIVERY_FEE_MAX_CENTS + 1 }) }), "deliveryFeeCents");
            await expectInvalidField(() => placeOrder(kit, seed, { fulfillment: { fulfillmentType: "drone" as never } }), "fulfillmentType");
            await expectInvalidField(() => placeOrder(kit, seed, { notes: "x".repeat(ORDER_NOTES_MAX_LENGTH + 1) }), "notes");

            await expectRejected(() => kit.orders.createOrder(seed.admin.id, orderInput(kit, seed, { clientId: "nobody" })), NotFoundError);
            await expectRejected(() => placeOrder(kit, seed, { locationId: "nowhere" }), NotFoundError);

            await assertNoOrdersSaved(kit);
            console.log("  OK: sixteen invalid orders rejected, nothing saved");
        },
    },
    {
        title: "Clients only act on their own orders, and staff only on their own location",
        kind: "rejected",
        main: true,
        async run() {
            const { kit, seed } = await ordersWorld();
            const other = await kit.users.registerClient(clientInput({ username: "luis.perez", email: "luis@example.com", phoneNumber: "6629876543" }));
            const norte = await kit.locations.createLocation("Norte", "Calle 9");
            const norteStaff = await kit.users.createStaff(seed.admin.id, {
                username: "barista2", email: "barista2@cafe.test", password: PASSWORD, locationId: norte.id,
            });
            const order = await placeOrder(kit, seed);

            // creating
            await expectRejected(() => kit.orders.createOrder(other.id, orderInput(kit, seed)), UnauthorizedActionError);
            await expectRejected(() => kit.orders.createOrder(seed.staff.id, orderInput(kit, seed)), UnauthorizedActionError);
            // reading and cancelling someone else's order
            await expectRejected(() => kit.orders.getOrder(other.id, order.id), UnauthorizedActionError);
            await expectRejected(() => kit.orders.cancelOrder(other.id, order.id), UnauthorizedActionError);
            await expectRejected(() => kit.orders.listClientOrders(other.id, seed.client.id), UnauthorizedActionError);
            // staff of another location
            await expectRejected(() => kit.orders.getOrder(norteStaff.id, order.id), UnauthorizedActionError);
            await expectRejected(() => kit.orders.startPreparing(norteStaff.id, order.id), UnauthorizedActionError);
            await expectRejected(() => kit.orders.cancelOrder(norteStaff.id, order.id), UnauthorizedActionError);
            await expectRejected(() => kit.orders.listLocationOrders(norteStaff.id, seed.location.id), UnauthorizedActionError);
            // a client does not move the status
            await expectRejected(() => kit.orders.startPreparing(seed.client.id, order.id), UnauthorizedActionError);

            // what IS allowed: the owner, the staff of the location and an administrator
            assert.equal((await kit.orders.getOrder(seed.client.id, order.id)).id, order.id);
            assert.equal((await kit.orders.getOrder(seed.staff.id, order.id)).id, order.id);
            const byAdmin = await kit.orders.createOrder(seed.admin.id, orderInput(kit, seed));
            assert.equal(byAdmin.clientId, seed.client.id);
            assert.equal((await kit.orders.getOrder(seed.admin.id, order.id)).status, "pending");
            console.log("  OK: ten forbidden actions rejected; owner, location staff and administrator allowed");
        },
    },
    {
        title: "Staff move an order forward; the client sees it, newest first",
        kind: "works",
        async run() {
            const { kit, seed } = await ordersWorld();
            const first = await placeOrder(kit, seed);

            kit.clock.advanceHours(1);
            const preparing = await kit.orders.startPreparing(seed.staff.id, first.id);
            assert.equal(preparing.status, "preparing");
            assert.ok(preparing.updatedAt.getTime() > first.createdAt.getTime(), "updatedAt moves with the status");
            assert.equal(preparing.createdAt.getTime(), first.createdAt.getTime(), "createdAt never changes");

            assert.equal((await kit.orders.markReady(seed.staff.id, first.id)).status, "ready");
            assert.equal((await kit.orders.markDelivered(seed.staff.id, first.id)).status, "delivered");

            kit.clock.advanceHours(1);
            const second = await placeOrder(kit, seed);

            const mine = await kit.orders.listClientOrders(seed.client.id, seed.client.id);
            assert.deepEqual(mine.map((o) => o.id), [second.id, first.id]);
            const atLocation = await kit.orders.listLocationOrders(seed.staff.id, seed.location.id);
            assert.equal(atLocation.length, 2);
            console.log("  OK: pending -> preparing -> ready -> delivered; list newest first");
        },
    },
    {
        title: "The status only moves forward, and a deactivated staff member cannot move it",
        kind: "rejected",
        async run() {
            const { kit, seed } = await ordersWorld();
            const order = await placeOrder(kit, seed);

            await expectRejected(() => kit.orders.markReady(seed.staff.id, order.id), InvalidStatusTransitionError);
            await expectRejected(() => kit.orders.markDelivered(seed.staff.id, order.id), InvalidStatusTransitionError);
            await kit.orders.startPreparing(seed.staff.id, order.id);
            await expectRejected(() => kit.orders.startPreparing(seed.staff.id, order.id), InvalidStatusTransitionError);

            await kit.orders.markReady(seed.staff.id, order.id);
            await kit.orders.markDelivered(seed.staff.id, order.id);
            await expectRejected(() => kit.orders.cancelOrder(seed.admin.id, order.id), InvalidStatusTransitionError);

            const cancelled = await placeOrder(kit, seed);
            await kit.orders.cancelOrder(seed.admin.id, cancelled.id);
            await expectRejected(() => kit.orders.startPreparing(seed.staff.id, cancelled.id), InvalidStatusTransitionError);

            const another = await placeOrder(kit, seed);
            await kit.users.deactivateStaff(seed.admin.id, seed.staff.id);
            await expectRejected(() => kit.orders.startPreparing(seed.staff.id, another.id), InactiveStaffError);
            console.log("  OK: skipping steps, repeating, un-delivering, un-cancelling and inactive staff rejected");
        },
    },
    {
        title: "A delivered order earns loyalty once, and a cancelled one earns nothing",
        kind: "works",
        async run() {
            const { kit, seed } = await ordersWorld(visitProgramInput());

            const cancelled = await placeOrder(kit, seed);
            await kit.orders.cancelOrder(seed.client.id, cancelled.id);
            assert.equal(await balanceOf(kit, seed), 0);

            const order = await placeOrder(kit, seed);
            await expectRejected(() => kit.orders.markDelivered(seed.staff.id, order.id), InvalidStatusTransitionError);
            assert.equal(await balanceOf(kit, seed), 0, "not delivered yet, nothing earned");

            await deliver(kit, seed, order.id);
            assert.equal(await balanceOf(kit, seed), 1);
            await expectRejected(() => kit.orders.markDelivered(seed.staff.id, order.id), InvalidStatusTransitionError);
            assert.equal(await balanceOf(kit, seed), 1, "delivering again cannot earn twice");
            console.log("  OK: balance after one delivered order ->", await balanceOf(kit, seed));
        },
    },
    {
        title: "A free item is redeemed with points; only the money really paid earns loyalty",
        kind: "works",
        async run() {
            const { kit, seed } = await ordersWorld(visitProgramInput());
            await giveBalance(kit, seed, 3);

            const order = await placeOrder(kit, seed, {
                items: [drinkItem(seed, {}, 2)],
                loyalty: { mode: "free_item", itemIndex: 0 },
            });

            assert.equal(order.totalCents, 10000);
            assert.deepEqual(order.loyaltyRedemption, { amount: 3, coveredCents: 5000 });
            assert.equal(await balanceOf(kit, seed), 0, "the 3 points were taken");

            await deliver(kit, seed, order.id);
            assert.equal(await balanceOf(kit, seed), 1, "5000 cents were really paid, so the visit counts");
            console.log("  OK: redeemed 3 points, covered", order.loyaltyRedemption?.coveredCents, "cents");
        },
    },
    {
        title: "Balance pays part of an order; the earning is on what was paid in money",
        kind: "works",
        async run() {
            const { kit, seed } = await ordersWorld(walletProgramInput());
            await giveBalance(kit, seed, 2000);

            const order = await placeOrder(kit, seed, { loyalty: { mode: "account_balance", amountCents: 2000 } });

            assert.equal(order.totalCents, 5000);
            assert.deepEqual(order.loyaltyRedemption, { amount: 2000, coveredCents: 2000 });
            assert.equal(await balanceOf(kit, seed), 0);

            await deliver(kit, seed, order.id);
            // 5% of the 3000 cents paid in money
            assert.equal(await balanceOf(kit, seed), 150);
            console.log("  OK: balance after delivery ->", await balanceOf(kit, seed));
        },
    },
    {
        title: "Cancelling gives back exactly what the order redeemed, once",
        kind: "works",
        async run() {
            const visits = await ordersWorld(visitProgramInput());
            await giveBalance(visits.kit, visits.seed, 3);
            const free = await placeOrder(visits.kit, visits.seed, { loyalty: { mode: "free_item", itemIndex: 0 } });
            assert.equal(await balanceOf(visits.kit, visits.seed), 0);

            await visits.kit.orders.cancelOrder(visits.seed.client.id, free.id);
            assert.equal(await balanceOf(visits.kit, visits.seed), 3);
            await expectRejected(() => visits.kit.orders.cancelOrder(visits.seed.admin.id, free.id), InvalidStatusTransitionError);
            assert.equal(await balanceOf(visits.kit, visits.seed), 3, "a second cancel cannot refund twice");

            const wallet = await ordersWorld(walletProgramInput());
            await giveBalance(wallet.kit, wallet.seed, 2000);
            const paid = await placeOrder(wallet.kit, wallet.seed, { loyalty: { mode: "account_balance", amountCents: 2000 } });
            await wallet.kit.orders.startPreparing(wallet.seed.staff.id, paid.id);
            await wallet.kit.orders.cancelOrder(wallet.seed.staff.id, paid.id);
            assert.equal(await balanceOf(wallet.kit, wallet.seed), 2000);
            console.log("  OK: 3 points and 2000 cents returned once each");
        },
    },
    {
        title: "A redemption loyalty cannot honor stops the order, and nothing is taken",
        kind: "rejected",
        async run() {
            const noProgram = await ordersWorld();
            await expectRejected(() => placeOrder(noProgram.kit, noProgram.seed, { loyalty: { mode: "free_item", itemIndex: 0 } }), NoActiveProgramError);
            await assertNoOrdersSaved(noProgram.kit);

            const { kit, seed } = await ordersWorld(visitProgramInput());
            await expectRejected(() => placeOrder(kit, seed, { loyalty: { mode: "free_item", itemIndex: 0 } }), InsufficientBalanceError);
            await expectRejected(() => placeOrder(kit, seed, { loyalty: { mode: "account_balance", amountCents: 100 } }), RedeemModeMismatchError);
            await expectInvalidField(() => placeOrder(kit, seed, { loyalty: { mode: "free_item", itemIndex: 5 } }), "loyalty.itemIndex");

            // the redemption is the LAST step: an order that fails for another reason takes nothing
            await giveBalance(kit, seed, 3);
            await expectInvalidField(() => placeOrder(kit, seed, { scheduleTime: hoursFromNow(kit, -1), loyalty: { mode: "free_item", itemIndex: 0 } }), "scheduleTime");
            assert.equal(await balanceOf(kit, seed), 3);
            await assertNoOrdersSaved(kit);

            const wallet = await ordersWorld(walletProgramInput());
            await giveBalance(wallet.kit, wallet.seed, 10000);
            await expectRejected(() => placeOrder(wallet.kit, wallet.seed, { loyalty: { mode: "account_balance", amountCents: 6000 } }), BalanceExceedsOrderTotalError);
            await expectRejected(() => placeOrder(wallet.kit, wallet.seed, { loyalty: { mode: "free_item", itemIndex: 0 } }), RedeemModeMismatchError);
            assert.equal(await balanceOf(wallet.kit, wallet.seed), 10000);

            const poor = await ordersWorld(walletProgramInput());
            await giveBalance(poor.kit, poor.seed, 1000);
            await expectRejected(() => placeOrder(poor.kit, poor.seed, { loyalty: { mode: "account_balance", amountCents: 2000 } }), InsufficientBalanceError);
            assert.equal(await balanceOf(poor.kit, poor.seed), 1000);
            console.log("  OK: eight impossible redemptions rejected, balances untouched");
        },
    },
    {
        title: "A client cancels only while the order is pending; staff can cancel until delivery",
        kind: "rejected",
        async run() {
            const { kit, seed } = await ordersWorld();
            const order = await placeOrder(kit, seed);

            await kit.orders.startPreparing(seed.staff.id, order.id);
            await expectRejected(() => kit.orders.cancelOrder(seed.client.id, order.id), UnauthorizedActionError);

            const cancelled = await kit.orders.cancelOrder(seed.staff.id, order.id);
            assert.equal(cancelled.status, "cancelled");
            console.log("  OK: client blocked once preparing; staff cancelled ->", cancelled.status);
        },
    },
    {
        title: "A location with orders cannot be deleted",
        kind: "rejected",
        async run() {
            const { kit, seed } = await ordersWorld();
            const norte = await kit.locations.createLocation("Norte", "Calle 9");
            const empty = await kit.locations.createLocation("Sur", "Calle 10");

            await placeOrder(kit, seed, { locationId: norte.id });

            const error = await expectRejected(() => kit.locations.deleteLocation(norte.id), LocationInUseError);
            await kit.locations.deleteLocation(empty.id);
            console.log("  OK: rejected ->", error.message);
        },
    },
    {
        title: "Changing an order that was read does not change the stored one",
        kind: "works",
        async run() {
            const { kit, seed } = await ordersWorld();
            const order = await placeOrder(kit, seed);

            const line = order.items[0];
            assert.ok(line);
            line.quantity = 9;
            line.configuration.extras.push({ extraId: "x", addedQuantity: 1 });
            order.status = "delivered";

            const stored = await kit.orders.getOrder(seed.client.id, order.id);
            assert.equal(stored.status, "pending");
            assert.equal(stored.items[0]?.quantity, 1);
            assert.equal(stored.items[0]?.configuration.extras.length, 0);
            console.log("  OK: the stored order is independent of what was returned");
        },
    },
];