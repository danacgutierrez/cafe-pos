import { InMemoryOrderRepository } from "./infrastructure/order/memory/in-memory-order.repository.js";
import { OrderService, Actor, CreateOrderInput } from "./domain/order/services/order-service.js";
import { EmptyOrderError } from "./domain/order/errors/empty-order-error.js";
import { MissingDeliveryInfoError } from "./domain/order/errors/missing-delivery-info-error.js";
import { InvalidScheduleTimeError } from "./domain/order/errors/invalid-schedule-time-error.js";
import { InvalidStatusTransitionError } from "./domain/order/errors/invalid-status-transition-error.js";
import { UnauthorizedStatusChangeError } from "./domain/order/errors/unauthorized-status-change-error.js";
import { OrderNotCancellableError } from "./domain/order/errors/order-not-cancellable-error.js";
import { OrderNotModifiableError } from "./domain/order/errors/order-not-modifiable-error.js";

const staff: Actor = { id: "staff-1", role: "staff" };
const client: Actor = { id: "client-1", role: "client" };

function buildService() {
  const repo = new InMemoryOrderRepository();
  const service = new OrderService(repo);
  return { service, repo };
}

function inMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

function pickupInput(overrides: Partial<CreateOrderInput> = {}): CreateOrderInput {
  return {
    clientId: client.id,
    scheduleTime: inMinutes(30),
    notes: "",
    fulfillmentType: "pickup",
    details: [
      { productId: "latte", quantity: 1, price: 50 },
      { productId: "mocha", quantity: 2, price: 30 },
    ],
    ...overrides,
  };
}

async function scenario1_createPickupOrder() {
  console.log("\n=== Scenario 1: create pickup order ===");
  const { service, repo } = buildService();

  const order = await service.createOrder(pickupInput());
  const details = await repo.findDetails(order.id);
  const history = await service.getStatusHistory(order.id);

  console.log("  Status:", order.status, "(expected: received)");
  console.log("  Total:", order.total, "(expected: 110 = 50 + 30 x 2)");
  console.log("  Lines saved:", details.length, "(expected: 2)");
  console.log("  History entries:", history.length, "(expected: 1)");
}

async function scenario2_createDeliveryOrder() {
  console.log("\n=== Scenario 2: create delivery order ===");
  const { service } = buildService();

  const order = await service.createOrder(
    pickupInput({
      fulfillmentType: "delivery",
      deliveryAddress: "Main St 123",
      deliveryMode: "own_courier",
      deliveryFee: 20,
    }),
  );

  console.log("  Delivery mode:", order.deliveryMode, "(expected: own_courier)");
  console.log("  Total:", order.total, "(expected: 130 = 110 + 20 delivery fee)");
}

async function scenario3_emptyOrder() {
  console.log("\n=== Scenario 3: order without items (rejected) ===");
  const { service } = buildService();

  try {
    await service.createOrder(pickupInput({ details: [] }));
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof EmptyOrderError) {
      console.log("  Correctly rejected:", e.message);
    } else {
      throw e;
    }
  }
}

async function scenario4_deliveryWithoutInfo() {
  console.log("\n=== Scenario 4: delivery without address or mode (rejected) ===");
  const { service } = buildService();

  try {
    await service.createOrder(pickupInput({ fulfillmentType: "delivery" }));
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof MissingDeliveryInfoError) {
      console.log("  Correctly rejected:", e.message);
      console.log("  Missing fields:", e.missingFields, "(expected: deliveryAddress, deliveryMode)");
    } else {
      throw e;
    }
  }
}

async function scenario5_pickupDoesNotNeedDeliveryInfo() {
  console.log("\n=== Scenario 5: pickup ignores delivery data ===");
  const { service } = buildService();

  const order = await service.createOrder(pickupInput());
  console.log("  Delivery address:", order.deliveryAddress, "(expected: undefined)");
  console.log("  Delivery mode:", order.deliveryMode, "(expected: undefined)");
}

async function scenario6_invalidScheduleTime() {
  console.log("\n=== Scenario 6: schedule in the past or too soon (rejected) ===");
  const { service } = buildService();

  for (const [label, minutes] of [["past", -15], ["5 minutes ahead", 5]] as const) {
    try {
      await service.createOrder(pickupInput({ scheduleTime: inMinutes(minutes) }));
      console.log(`  ERROR (${label}): should not have been allowed`);
    } catch (e) {
      if (e instanceof InvalidScheduleTimeError) {
        console.log(`  Correctly rejected (${label}):`, e.message);
      } else {
        throw e;
      }
    }
  }
}

async function scenario7_statusAdvancesInOrder() {
  console.log("\n=== Scenario 7: status advances step by step ===");
  const { service } = buildService();

  const order = await service.createOrder(pickupInput());
  await service.changeStatus(order.id, "in_preparation", staff);
  await service.changeStatus(order.id, "ready", staff);
  await service.changeStatus(order.id, "delivered", staff);

  const updated = await service.getOrder(order.id);
  const history = await service.getStatusHistory(order.id);
  console.log("  Final status:", updated.status, "(expected: delivered)");
  console.log("  History:", history.map((h) => h.status), "(expected: received, in_preparation, ready, delivered)");
}

async function scenario8_skipStatus() {
  console.log("\n=== Scenario 8: skip a status (rejected) ===");
  const { service } = buildService();

  const order = await service.createOrder(pickupInput());

  try {
    await service.changeStatus(order.id, "ready", staff);
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof InvalidStatusTransitionError) {
      console.log("  Correctly rejected:", e.message);
    } else {
      throw e;
    }
  }

  const unchanged = await service.getOrder(order.id);
  console.log("  Status unchanged:", unchanged.status, "(expected: received)");
}

async function scenario9_goBackwards() {
  console.log("\n=== Scenario 9: go back to a previous status (rejected) ===");
  const { service } = buildService();

  const order = await service.createOrder(pickupInput());
  await service.changeStatus(order.id, "in_preparation", staff);

  try {
    await service.changeStatus(order.id, "received", staff);
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof InvalidStatusTransitionError) {
      console.log("  Correctly rejected:", e.message);
    } else {
      throw e;
    }
  }
}

async function scenario10_clientCannotChangeStatus() {
  console.log("\n=== Scenario 10: client changes status (rejected) ===");
  const { service } = buildService();

  const order = await service.createOrder(pickupInput());

  try {
    await service.changeStatus(order.id, "in_preparation", client);
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof UnauthorizedStatusChangeError) {
      console.log("  Correctly rejected:", e.message);
    } else {
      throw e;
    }
  }
}

async function scenario11_cancelReceivedOrder() {
  console.log("\n=== Scenario 11: cancel an order that was just received ===");
  const { service } = buildService();

  const order = await service.createOrder(pickupInput());
  await service.cancelOrder(order.id, staff);

  const updated = await service.getOrder(order.id);
  console.log("  Status:", updated.status, "(expected: cancelled)");
}

async function scenario12_cancelInPreparation() {
  console.log("\n=== Scenario 12: cancel an order already in preparation (rejected) ===");
  const { service } = buildService();

  const order = await service.createOrder(pickupInput());
  await service.changeStatus(order.id, "in_preparation", staff);

  try {
    await service.cancelOrder(order.id, staff);
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof OrderNotCancellableError) {
      console.log("  Correctly rejected:", e.message);
    } else {
      throw e;
    }
  }

  const unchanged = await service.getOrder(order.id);
  console.log("  Status unchanged:", unchanged.status, "(expected: in_preparation)");
}

async function scenario13_modifyClosedOrder() {
  console.log("\n=== Scenario 13: modify delivered and cancelled orders (rejected) ===");
  const { service } = buildService();

  const delivered = await service.createOrder(pickupInput());
  await service.changeStatus(delivered.id, "in_preparation", staff);
  await service.changeStatus(delivered.id, "ready", staff);
  await service.changeStatus(delivered.id, "delivered", staff);

  const cancelled = await service.createOrder(pickupInput());
  await service.cancelOrder(cancelled.id, staff);

  for (const [label, id] of [["delivered", delivered.id], ["cancelled", cancelled.id]] as const) {
    try {
      await service.changeStatus(id, "in_preparation", staff);
      console.log(`  ERROR (${label}): should not have been allowed`);
    } catch (e) {
      if (e instanceof OrderNotModifiableError) {
        console.log(`  Correctly rejected (${label}):`, e.message);
      } else {
        throw e;
      }
    }
  }
}

async function scenario14_listOrders() {
  console.log("\n=== Scenario 14: list orders by client and by status ===");
  const { service } = buildService();

  const first = await service.createOrder(pickupInput());
  await service.createOrder(pickupInput());
  await service.createOrder(pickupInput({ clientId: "client-2" }));
  await service.changeStatus(first.id, "in_preparation", staff);

  const byClient = await service.listByClient(client.id);
  const received = await service.listByStatus("received");
  const inPreparation = await service.listByStatus("in_preparation");

  console.log("  Orders of client-1:", byClient.length, "(expected: 2)");
  console.log("  Orders in 'received':", received.length, "(expected: 2)");
  console.log("  Orders in 'in_preparation':", inPreparation.length, "(expected: 1)");
}

async function main() {
  await scenario1_createPickupOrder();
  await scenario2_createDeliveryOrder();
  await scenario3_emptyOrder();
  await scenario4_deliveryWithoutInfo();
  await scenario5_pickupDoesNotNeedDeliveryInfo();
  await scenario6_invalidScheduleTime();
  await scenario7_statusAdvancesInOrder();
  await scenario8_skipStatus();
  await scenario9_goBackwards();
  await scenario10_clientCannotChangeStatus();
  await scenario11_cancelReceivedOrder();
  await scenario12_cancelInPreparation();
  await scenario13_modifyClosedOrder();
  await scenario14_listOrders();
}

main();