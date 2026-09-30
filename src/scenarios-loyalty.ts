import { InMemoryLoyaltyRepository } from "./infrastructure/loyalty/memory/in-memory-loyalty.repository.js";
import { EarnForOrderInput, LoyaltyService } from "./domain/loyalty/services/loyalty-service.js";
import { InsufficientPointsError } from "./domain/loyalty/errors/insufficient-points-error.js";
import { MultipleRewardsPerOrderError } from "./domain/loyalty/errors/multiple-rewards-per-order-error.js";
import { BalanceExceedsOrderTotalError } from "./domain/loyalty/errors/balance-exceeds-order-total-error.js";
import { MissingAdjustmentInfoError } from "./domain/loyalty/errors/missing-adjustment-info-error.js";
import { NoActiveProgramError } from "./domain/loyalty/errors/no-active-program-error.js";
import { OrderNotEligibleForPointsError } from "./domain/loyalty/errors/order-not-eligible-for-points-error.js";

const CLIENT = "client-1";
const OWNER = "owner-1";

function buildService() {
  const repo = new InMemoryLoyaltyRepository();
  const service = new LoyaltyService(repo);
  return { service, repo };
}

/** Per-visit program: 1 point per visit, 9 points for a free item. */
async function activateVisitsProgram(service: LoyaltyService) {
  const program = await service.createProgram({
    name: "Visits",
    earnMode: "per_visit",
    earnValue: 1,
    redeemMode: "free_item",
    pointsPerReward: 9,
  });
  await service.activateProgram(program.id);
  return program;
}

/** Percentage program: 5% of what was paid becomes account balance. */
async function activatePercentageProgram(service: LoyaltyService) {
  const program = await service.createProgram({
    name: "Cashback",
    earnMode: "per_amount",
    earnValue: 5,
    redeemMode: "account_balance",
    pointsPerReward: 0,
  });
  await service.activateProgram(program.id);
  return program;
}

function delivered(orderId: string, overrides: Partial<EarnForOrderInput> = {}): EarnForOrderInput {
  return {
    orderId,
    clientId: CLIENT,
    orderStatus: "delivered",
    amountPaid: 50,
    ...overrides,
  };
}

async function scenario1_onlyOneActiveProgram() {
  console.log("\n=== Scenario 1: only one active program at a time ===");
  const { service, repo } = buildService();

  const first = await activateVisitsProgram(service);
  const second = await activatePercentageProgram(service);

  const all = await repo.findAll();
  const active = await repo.findActive();
  const previous = await repo.findById(first.id);

  console.log("  Active program:", active?.name, "(expected: Cashback)");
  console.log("  Active programs:", all.filter((p) => p.isActive).length, "(expected: 1)");
  console.log("  Previous program kept:", previous !== null, "(expected: true)");
  console.log("  Previous is inactive:", previous?.isActive === false, "(expected: true)");
  console.log("  Second id matches:", active?.id === second.id, "(expected: true)");
}

async function scenario2_earnVisitPoint() {
  console.log("\n=== Scenario 2: earn a point for a delivered order ===");
  const { service } = buildService();
  await activateVisitsProgram(service);

  const transaction = await service.earnForOrder(delivered("order-1"));
  const balance = await service.getBalance(CLIENT);

  console.log("  Transaction type:", transaction?.transactionType, "(expected: earn)");
  console.log("  Balance:", balance, "(expected: 1)");
}

async function scenario3_orderNotDelivered() {
  console.log("\n=== Scenario 3: order not delivered yet (rejected) ===");
  const { service } = buildService();
  await activateVisitsProgram(service);

  try {
    await service.earnForOrder(delivered("order-1", { orderStatus: "in_preparation" }));
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof OrderNotEligibleForPointsError) {
      console.log("  Correctly rejected:", e.message);
    } else {
      throw e;
    }
  }

  const balance = await service.getBalance(CLIENT);
  console.log("  Balance unchanged:", balance, "(expected: 0)");
}

async function scenario4_oneVisitPointPerDay() {
  console.log("\n=== Scenario 4: only one visit point per day ===");
  const { service } = buildService();
  await activateVisitsProgram(service);

  const first = await service.earnForOrder(delivered("order-1"));
  const second = await service.earnForOrder(delivered("order-2"));
  const sameOrderAgain = await service.earnForOrder(delivered("order-1"));

  console.log("  First order earned:", first !== null, "(expected: true)");
  console.log("  Second order same day earned:", second !== null, "(expected: false)");
  console.log("  Same order again earned:", sameOrderAgain !== null, "(expected: false)");
  console.log("  Balance:", await service.getBalance(CLIENT), "(expected: 1)");
}

async function scenario5_progressTowardsReward() {
  console.log("\n=== Scenario 5: progress towards the next reward ===");
  const { service } = buildService();
  await activateVisitsProgram(service);

  await service.adjustBalance({ clientId: CLIENT, amount: 4, reason: "Initial balance", changedById: OWNER });
  const before = await service.getProgress(CLIENT);
  console.log("  Balance 4 -> available:", before.rewardsAvailable, "(expected: 0)");
  console.log("  Balance 4 -> missing:", before.pointsToNextReward, "(expected: 5)");

  await service.adjustBalance({ clientId: CLIENT, amount: 5, reason: "Second batch", changedById: OWNER });
  const after = await service.getProgress(CLIENT);
  console.log("  Balance 9 -> available:", after.rewardsAvailable, "(expected: 1)");
}

async function scenario6_redeemFreeItem() {
  console.log("\n=== Scenario 6: redeem a free item ===");
  const { service } = buildService();
  await activateVisitsProgram(service);
  await service.adjustBalance({ clientId: CLIENT, amount: 10, reason: "Initial balance", changedById: OWNER });

  const transaction = await service.redeemReward({ clientId: CLIENT, orderId: "order-1" });

  console.log("  Deducted:", transaction.amount, "(expected: -9)");
  console.log("  Balance:", await service.getBalance(CLIENT), "(expected: 1, the excess is kept)");
}

async function scenario7_insufficientPoints() {
  console.log("\n=== Scenario 7: redeem without enough points (rejected) ===");
  const { service } = buildService();
  await activateVisitsProgram(service);
  await service.adjustBalance({ clientId: CLIENT, amount: 5, reason: "Initial balance", changedById: OWNER });

  try {
    await service.redeemReward({ clientId: CLIENT, orderId: "order-1" });
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof InsufficientPointsError) {
      console.log("  Correctly rejected:", e.message);
    } else {
      throw e;
    }
  }

  console.log("  Balance unchanged:", await service.getBalance(CLIENT), "(expected: 5)");
}

async function scenario8_oneRewardPerOrder() {
  console.log("\n=== Scenario 8: more than one reward per order (rejected) ===");
  const { service } = buildService();
  await activateVisitsProgram(service);
  await service.adjustBalance({ clientId: CLIENT, amount: 27, reason: "Initial balance", changedById: OWNER });

  try {
    await service.redeemReward({ clientId: CLIENT, orderId: "order-1", rewardsRequested: 2 });
    console.log("  ERROR (two at once): should not have been allowed");
  } catch (e) {
    if (e instanceof MultipleRewardsPerOrderError) {
      console.log("  Correctly rejected (two at once):", e.message);
    } else {
      throw e;
    }
  }

  await service.redeemReward({ clientId: CLIENT, orderId: "order-1" });
  try {
    await service.redeemReward({ clientId: CLIENT, orderId: "order-1" });
    console.log("  ERROR (second redeem): should not have been allowed");
  } catch (e) {
    if (e instanceof MultipleRewardsPerOrderError) {
      console.log("  Correctly rejected (second redeem):", e.message);
    } else {
      throw e;
    }
  }

  console.log("  Balance:", await service.getBalance(CLIENT), "(expected: 18, only one was deducted)");
}

async function scenario9_refundCancelledOrder() {
  console.log("\n=== Scenario 9: cancelled order returns the redeemed points ===");
  const { service } = buildService();
  await activateVisitsProgram(service);
  await service.adjustBalance({ clientId: CLIENT, amount: 9, reason: "Initial balance", changedById: OWNER });
  await service.redeemReward({ clientId: CLIENT, orderId: "order-1" });
  console.log("  Balance after redeem:", await service.getBalance(CLIENT), "(expected: 0)");

  const refunds = await service.refundOrder("order-1");
  console.log("  Refunds recorded:", refunds.length, "(expected: 1)");
  console.log("  Balance after refund:", await service.getBalance(CLIENT), "(expected: 9)");

  const again = await service.refundOrder("order-1");
  console.log("  Refunds on second call:", again.length, "(expected: 0, already returned)");
  console.log("  Balance unchanged:", await service.getBalance(CLIENT), "(expected: 9)");
}

async function scenario10_percentageEarn() {
  console.log("\n=== Scenario 10: percentage program earns balance ===");
  const { service } = buildService();
  await activatePercentageProgram(service);

  await service.earnForOrder(delivered("order-1", { amountPaid: 200 }));
  await service.earnForOrder(delivered("order-2", { amountPaid: 100 }));

  console.log("  Balance:", await service.getBalance(CLIENT), "(expected: 15 = 5% of 200 + 5% of 100)");
  console.log("  (no daily limit: both orders on the same day earned)");
}

async function scenario11_nothingPaidWithMoney() {
  console.log("\n=== Scenario 11: order paid entirely with rewards earns nothing ===");
  const { service } = buildService();
  await activateVisitsProgram(service);

  const result = await service.earnForOrder(delivered("order-1", { amountPaid: 0 }));

  console.log("  Earned:", result !== null, "(expected: false)");
  console.log("  Balance:", await service.getBalance(CLIENT), "(expected: 0)");
}

async function scenario12_redeemBalance() {
  console.log("\n=== Scenario 12: use account balance in an order ===");
  const { service } = buildService();
  await activatePercentageProgram(service);
  await service.earnForOrder(delivered("order-1", { amountPaid: 200 }));

  await service.redeemBalance({ clientId: CLIENT, orderId: "order-2", amount: 4, orderTotal: 100 });
  console.log("  Balance after using 4:", await service.getBalance(CLIENT), "(expected: 6)");

  try {
    await service.redeemBalance({ clientId: CLIENT, orderId: "order-3", amount: 150, orderTotal: 100 });
    console.log("  ERROR (over total): should not have been allowed");
  } catch (e) {
    if (e instanceof BalanceExceedsOrderTotalError) {
      console.log("  Correctly rejected (over total):", e.message);
    } else {
      throw e;
    }
  }

  try {
    await service.redeemBalance({ clientId: CLIENT, orderId: "order-3", amount: 50, orderTotal: 100 });
    console.log("  ERROR (not enough balance): should not have been allowed");
  } catch (e) {
    if (e instanceof InsufficientPointsError) {
      console.log("  Correctly rejected (not enough balance):", e.message);
    } else {
      throw e;
    }
  }

  console.log("  Balance unchanged:", await service.getBalance(CLIENT), "(expected: 6)");
}

async function scenario13_adjustments() {
  console.log("\n=== Scenario 13: manual adjustments ===");
  const { service } = buildService();
  await activateVisitsProgram(service);

  try {
    await service.adjustBalance({ clientId: CLIENT, amount: 3, reason: " ", changedById: "" });
    console.log("  ERROR (no info): should not have been allowed");
  } catch (e) {
    if (e instanceof MissingAdjustmentInfoError) {
      console.log("  Correctly rejected (no info):", e.message);
    } else {
      throw e;
    }
  }

  const adjustment = await service.adjustBalance({
    clientId: CLIENT,
    amount: 3,
    reason: "Compensation for a delayed order",
    changedById: OWNER,
  });
  console.log("  Reason saved:", adjustment.reason, "(expected: Compensation for a delayed order)");
  console.log("  Responsible saved:", adjustment.changedById, "(expected: owner-1)");

  try {
    await service.adjustBalance({ clientId: CLIENT, amount: -10, reason: "Correction", changedById: OWNER });
    console.log("  ERROR (negative balance): should not have been allowed");
  } catch (e) {
    if (e instanceof InsufficientPointsError) {
      console.log("  Correctly rejected (negative balance):", e.message);
    } else {
      throw e;
    }
  }

  console.log("  Balance:", await service.getBalance(CLIENT), "(expected: 3)");
}

async function scenario14_noActiveProgram() {
  console.log("\n=== Scenario 14: no active program ===");
  const { service } = buildService();

  const earned = await service.earnForOrder(delivered("order-1"));
  console.log("  Delivering an order does not fail, earned:", earned !== null, "(expected: false)");

  try {
    await service.redeemReward({ clientId: CLIENT, orderId: "order-1" });
    console.log("  ERROR: should not have been allowed");
  } catch (e) {
    if (e instanceof NoActiveProgramError) {
      console.log("  Redeem correctly rejected:", e.message);
    } else {
      throw e;
    }
  }
}

async function scenario15_configChangeKeepsBalance() {
  console.log("\n=== Scenario 15: changing the configuration keeps earned points ===");
  const { service } = buildService();
  const program = await activateVisitsProgram(service);
  await service.adjustBalance({ clientId: CLIENT, amount: 10, reason: "Initial balance", changedById: OWNER });

  await service.updateProgram(program.id, { pointsPerReward: 5 });

  const progress = await service.getProgress(CLIENT);
  console.log("  Balance:", progress.balance, "(expected: 10, not modified)");
  console.log("  Rewards available with new goal:", progress.rewardsAvailable, "(expected: 2)");
}

async function scenario16_historyIsPermanent() {
  console.log("\n=== Scenario 16: history keeps every movement, newest first ===");
  const { service } = buildService();
  await activateVisitsProgram(service);

  await service.adjustBalance({ clientId: CLIENT, amount: 9, reason: "Initial balance", changedById: OWNER });
  await service.earnForOrder(delivered("order-1"));
  await service.redeemReward({ clientId: CLIENT, orderId: "order-2" });

  const history = await service.listHistory(CLIENT);
  console.log(
    "  History:",
    history.map((t) => t.transactionType),
    "(expected: redeem, earn, adjustment)",
  );
  console.log(
    "  Balances after:",
    history.map((t) => t.balanceAfter),
    "(expected: 1, 10, 9)",
  );
}

async function main() {
  await scenario1_onlyOneActiveProgram();
  await scenario2_earnVisitPoint();
  await scenario3_orderNotDelivered();
  await scenario4_oneVisitPointPerDay();
  await scenario5_progressTowardsReward();
  await scenario6_redeemFreeItem();
  await scenario7_insufficientPoints();
  await scenario8_oneRewardPerOrder();
  await scenario9_refundCancelledOrder();
  await scenario10_percentageEarn();
  await scenario11_nothingPaidWithMoney();
  await scenario12_redeemBalance();
  await scenario13_adjustments();
  await scenario14_noActiveProgram();
  await scenario15_configChangeKeepsBalance();
  await scenario16_historyIsPermanent();
}

main();