import assert from "node:assert/strict";
import { DuplicateNameError } from "../shared/duplicate-name-error";
import { NotFoundError } from "../shared/not-found-error";
import { UnauthorizedActionError } from "../shared/unauthorized-action-error";
import {
    BalanceExceedsOrderTotalError, InsufficientBalanceError, MultipleRewardsPerOrderError, NoActiveProgramError,
    OrderNotEligibleForLoyaltyError, ProgramSwitchWouldMixUnitsError, RedeemModeMismatchError,
} from "../loyalty/domain/errors";
import { EARN_PERCENT_MAX, POINTS_PER_REWARD_MAX } from "../loyalty/domain/limits";
import { expectInvalidField, expectRejected } from "./helpers";
import { Scenario } from "./scenario";
import { buildLoyalty, clientInput, LoyaltyKit, seedLoyalty, seedStaff, visitProgramInput, walletProgramInput } from "./setup";

/** A delivered order paid in money. */
function delivered(clientId: string, orderId: string, amountPaidCents = 4500) {
    return { orderId, clientId, isDelivered: true, amountPaidCents };
}

/** Gives the client `points` through ordinary earning (1 point per delivered order). */
async function earnPoints(kit: LoyaltyKit, clientId: string, points: number) {
    for (let i = 0; i < points; i++) {
        await kit.loyalty.earnForOrder(delivered(clientId, `seed-${i}`));
    }
}

export const loyaltyScenarios: Scenario[] = [
    {
        title: "An administrator creates loyalty programs; they start inactive",
        kind: "works",
        async run() {
            const kit = buildLoyalty();
            const { admin } = await seedLoyalty(kit, walletProgramInput());

            const visits = await kit.loyalty.createProgram(admin.id, visitProgramInput({ name: "  Coffee   card " }));

            assert.equal(visits.name, "Coffee card");
            assert.equal(visits.isActive, false);
            assert.equal(visits.earnMode, "per_visit");
            assert.equal((await kit.programRepository.findActive())?.name, "Wallet");
            console.log("  OK: created inactive ->", visits.name);
        },
    },
    {
        title: "Only two ways of working are valid, and their numbers must be whole and in range",
        kind: "rejected",
        async run() {
            const kit = buildLoyalty();
            const { admin } = await seedLoyalty(kit, walletProgramInput());
            const create = (overrides: Parameters<typeof visitProgramInput>[0]) => () => kit.loyalty.createProgram(admin.id, visitProgramInput(overrides));
            const createWallet = (overrides: Parameters<typeof walletProgramInput>[0]) => () => kit.loyalty.createProgram(admin.id, walletProgramInput({ name: "Other", ...overrides }));

            await expectInvalidField(create({ redeemMode: "account_balance" }), "redeemMode");
            await expectInvalidField(createWallet({ redeemMode: "free_item" }), "redeemMode");
            await expectInvalidField(create({ pointsPerReward: undefined }), "pointsPerReward");
            await expectInvalidField(create({ pointsPerReward: 0 }), "pointsPerReward");
            await expectInvalidField(create({ pointsPerReward: 2.5 }), "pointsPerReward");
            await expectInvalidField(create({ pointsPerReward: POINTS_PER_REWARD_MAX + 1 }), "pointsPerReward");
            await expectInvalidField(create({ earnValue: 0 }), "earnValue");
            await expectInvalidField(createWallet({ earnValue: 1.5 }), "earnValue");
            await expectInvalidField(createWallet({ earnValue: EARN_PERCENT_MAX + 1 }), "earnValue");
            await expectInvalidField(createWallet({ pointsPerReward: 5 }), "pointsPerReward");
            await expectInvalidField(create({ name: "   " }), "name");
            assert.equal((await kit.programRepository.findAll()).length, 1, "only the seeded program");
            console.log("  OK: eleven invalid programs rejected");
        },
    },
    {
        title: "Two programs cannot share a name, ignoring case",
        kind: "rejected",
        async run() {
            const kit = buildLoyalty();
            const { admin } = await seedLoyalty(kit, visitProgramInput());

            const error = await expectRejected(() => kit.loyalty.createProgram(admin.id, walletProgramInput({ name: "COFFEE CARD" })), DuplicateNameError);
            console.log("  OK: rejected ->", error.message);
        },
    },
    {
        title: "Only an administrator manages programs",
        kind: "rejected",
        async run() {
            const kit = buildLoyalty();
            const { admin, staff } = await seedStaff(kit);
            const client = await kit.users.registerClient(clientInput());
            const program = await kit.loyalty.createProgram(admin.id, visitProgramInput());

            for (const actor of [client.id, staff.id]) {
                await expectRejected(() => kit.loyalty.createProgram(actor, walletProgramInput()), UnauthorizedActionError);
                await expectRejected(() => kit.loyalty.updateProgram(actor, program.id, { earnValue: 2 }), UnauthorizedActionError);
                await expectRejected(() => kit.loyalty.activateProgram(actor, program.id), UnauthorizedActionError);
            }
            await expectRejected(() => kit.loyalty.activateProgram("nobody", program.id), NotFoundError);
            assert.equal((await kit.programRepository.findAll()).length, 1);
            assert.equal((await kit.loyalty.getProgram(program.id)).isActive, false);
            console.log("  OK: client and staff blocked on create, update and activate");
        },
    },
    {
        title: "A program can change its numbers and name, never its modes",
        kind: "works",
        async run() {
            const kit = buildLoyalty();
            const { admin, program } = await seedLoyalty(kit, visitProgramInput());
            kit.clock.advanceHours(1);

            const updated = await kit.loyalty.updateProgram(admin.id, program.id, { name: "Gold card", earnValue: 2, pointsPerReward: 5 });

            assert.equal(updated.name, "Gold card");
            assert.equal(updated.earnValue, 2);
            assert.ok(updated.earnMode === "per_visit" && updated.pointsPerReward === 5);
            assert.equal(updated.isActive, true, "stays active");
            assert.ok(updated.updatedAt > program.updatedAt, "updatedAt moved");
            console.log("  OK: updated ->", updated.name, updated.earnValue, "per visit, free item at", updated.pointsPerReward);
        },
    },
    {
        title: "An update cannot break a program's rules",
        kind: "rejected",
        async run() {
            const kit = buildLoyalty();
            const { admin, program } = await seedLoyalty(kit, walletProgramInput());
            const other = await kit.loyalty.createProgram(admin.id, visitProgramInput());
            const before = await kit.loyalty.getProgram(program.id);

            await expectInvalidField(() => kit.loyalty.updateProgram(admin.id, program.id, { pointsPerReward: 5 }), "pointsPerReward");
            await expectInvalidField(() => kit.loyalty.updateProgram(admin.id, program.id, { earnValue: 0 }), "earnValue");
            await expectRejected(() => kit.loyalty.updateProgram(admin.id, program.id, { name: other.name.toUpperCase() }), DuplicateNameError);
            await expectRejected(() => kit.loyalty.updateProgram(admin.id, "nope", { earnValue: 2 }), NotFoundError);
            assert.deepEqual(await kit.loyalty.getProgram(program.id), before, "must be untouched");
            console.log("  OK: four invalid updates rejected");
        },
    },
    {
        title: "Activating a program turns the previous one off and keeps the balances when the unit is the same",
        kind: "works",
        async run() {
            const kit = buildLoyalty();
            const { admin, client, program } = await seedLoyalty(kit, visitProgramInput());
            await earnPoints(kit, client.id, 1);
            const next = await kit.loyalty.createProgram(admin.id, visitProgramInput({ name: "Summer card", pointsPerReward: 2 }));

            await kit.loyalty.activateProgram(admin.id, next.id);

            assert.equal((await kit.loyalty.getProgram(program.id)).isActive, false);
            assert.equal((await kit.loyalty.getProgram(next.id)).isActive, true);
            assert.equal(await kit.loyalty.getBalance(client.id), 1, "points kept");
            console.log("  OK: switched between two point programs, balance kept");
        },
    },
    {
        title: "Switching between points and money is blocked while clients have balance",
        kind: "rejected",
        async run() {
            const kit = buildLoyalty();
            const { admin, client, program } = await seedLoyalty(kit, visitProgramInput());
            await earnPoints(kit, client.id, 1);
            const wallet = await kit.loyalty.createProgram(admin.id, walletProgramInput());

            const error = await expectRejected(() => kit.loyalty.activateProgram(admin.id, wallet.id), ProgramSwitchWouldMixUnitsError);

            assert.equal((await kit.programRepository.findActive())?.id, program.id, "the old program stays active");
            assert.equal(await kit.loyalty.getBalance(client.id), 1, "the balance is untouched");
            console.log("  OK: rejected ->", error.message);
        },
    },
    {
        title: "With an explicit reset, the switch zeroes every client's balance",
        kind: "works",
        async run() {
            const kit = buildLoyalty();
            const { admin, client } = await seedLoyalty(kit, visitProgramInput());
            const other = await kit.users.registerClient(clientInput({ username: "luis", email: "luis@example.com" }));
            await earnPoints(kit, client.id, 2);
            await earnPoints(kit, other.id, 1);
            const wallet = await kit.loyalty.createProgram(admin.id, walletProgramInput());

            await kit.loyalty.activateProgram(admin.id, wallet.id, { resetBalances: true });

            assert.equal((await kit.programRepository.findActive())?.id, wallet.id);
            assert.equal(await kit.loyalty.getBalance(client.id), 0);
            assert.equal(await kit.loyalty.getBalance(other.id), 0);
            console.log("  OK: both clients back to 0, wallet program active");
        },
    },
    {
        title: "Per visit: every delivered order grants the points of the program",
        kind: "works",
        async run() {
            const kit = buildLoyalty();
            const { client } = await seedLoyalty(kit, visitProgramInput({ earnValue: 2 }));

            const first = await kit.loyalty.earnForOrder(delivered(client.id, "o1"));
            const second = await kit.loyalty.earnForOrder(delivered(client.id, "o2", 100));

            assert.deepEqual(first, { clientId: client.id, amount: 2, balanceAfter: 2 });
            assert.equal(second?.balanceAfter, 4, "the amount paid does not matter in a per-visit program");
            console.log("  OK: 2 points per delivered order -> 2, then 4");
        },
    },
    {
        title: "Per amount: a percentage of what was really paid, never rounded up",
        kind: "works",
        async run() {
            const kit = buildLoyalty();
            const { client } = await seedLoyalty(kit, walletProgramInput());

            const big = await kit.loyalty.earnForOrder(delivered(client.id, "o1", 12345));
            const tiny = await kit.loyalty.earnForOrder(delivered(client.id, "o2", 10));

            assert.equal(big?.amount, 617, "5% of 12345 is 617.25: the fraction is dropped");
            assert.equal(tiny, null, "5% of 10 is 0.5 cents: nothing to grant");
            assert.equal(await kit.loyalty.getBalance(client.id), 617);
            console.log("  OK: 12345 cents paid -> 617 cents of balance; 10 cents -> nothing");
        },
    },
    {
        title: "Delivering never fails because of loyalty: nothing is granted when it does not apply",
        kind: "works",
        async run() {
            const kit = buildLoyalty();
            const admin = await kit.users.bootstrapAdministrator({ username: "admin", email: "admin@cafe.test", password: "correct-horse" });
            const client = await kit.users.registerClient(clientInput());

            assert.equal(await kit.loyalty.earnForOrder(delivered(client.id, "o1")), null, "no active program");

            const program = await kit.loyalty.createProgram(admin.id, walletProgramInput());
            await kit.loyalty.activateProgram(admin.id, program.id);
            assert.equal(await kit.loyalty.earnForOrder(delivered(client.id, "o2", 0)), null, "nothing paid in money");
            assert.equal(await kit.loyalty.getBalance(client.id), 0);
            console.log("  OK: both cases returned null without error");
        },
    },
    {
        title: "Earning needs a delivered order, a valid amount and a real client",
        kind: "rejected",
        async run() {
            const kit = buildLoyalty();
            const { admin, staff } = await seedStaff(kit);
            const client = await kit.users.registerClient(clientInput());
            const program = await kit.loyalty.createProgram(admin.id, walletProgramInput());
            await kit.loyalty.activateProgram(admin.id, program.id);
            const base = delivered(client.id, "o1", 1000);

            await expectRejected(() => kit.loyalty.earnForOrder({ ...base, isDelivered: false }), OrderNotEligibleForLoyaltyError);
            await expectInvalidField(() => kit.loyalty.earnForOrder({ ...base, amountPaidCents: 10.5 }), "amountPaidCents");
            await expectInvalidField(() => kit.loyalty.earnForOrder({ ...base, amountPaidCents: -1 }), "amountPaidCents");
            await expectRejected(() => kit.loyalty.earnForOrder({ ...base, clientId: "nobody" }), NotFoundError);
            await expectRejected(() => kit.loyalty.earnForOrder({ ...base, clientId: staff.id }), NotFoundError);
            assert.equal(await kit.loyalty.getBalance(client.id), 0);
            console.log("  OK: undelivered order, bad amounts and non-clients rejected");
        },
    },
    {
        title: "A client redeems a free item with their points, and sees their progress",
        kind: "works",
        async run() {
            const kit = buildLoyalty();
            const { client } = await seedLoyalty(kit, visitProgramInput());
            await earnPoints(kit, client.id, 4);
            assert.deepEqual(await kit.loyalty.getProgress(client.id), { balance: 4, rewardsAvailable: 1, pointsToNextReward: 2 });

            const redeemed = await kit.loyalty.redeemReward({ clientId: client.id });

            assert.deepEqual(redeemed, { clientId: client.id, amount: -3, balanceAfter: 1 });
            assert.deepEqual(await kit.loyalty.getProgress(client.id), { balance: 1, rewardsAvailable: 0, pointsToNextReward: 2 });
            console.log("  OK: 4 points -> redeemed a free item (-3) -> 1 point left");
        },
    },
    {
        title: "A free item needs enough points, one at a time, and a program that gives them",
        kind: "rejected",
        async run() {
            const kit = buildLoyalty();
            const { admin, client } = await seedLoyalty(kit, visitProgramInput());
            await expectRejected(() => kit.loyalty.redeemReward({ clientId: client.id }), InsufficientBalanceError);

            await kit.loyalty.adjustBalance(admin.id, { clientId: client.id, amount: 9 });
            await expectRejected(() => kit.loyalty.redeemReward({ clientId: client.id, rewardsRequested: 2 }), MultipleRewardsPerOrderError);
            await expectInvalidField(() => kit.loyalty.redeemReward({ clientId: client.id, rewardsRequested: 0 }), "rewardsRequested");
            assert.equal(await kit.loyalty.getBalance(client.id), 9, "nothing was charged");

            const wallet = await kit.loyalty.createProgram(admin.id, walletProgramInput());
            await kit.loyalty.activateProgram(admin.id, wallet.id, { resetBalances: true });
            await expectRejected(() => kit.loyalty.redeemReward({ clientId: client.id }), RedeemModeMismatchError);
            console.log("  OK: no points, two rewards, zero rewards and a balance program all rejected");
        },
    },
    {
        title: "A client pays part of an order with balance",
        kind: "works",
        async run() {
            const kit = buildLoyalty();
            const { admin, client } = await seedLoyalty(kit, walletProgramInput());
            await kit.loyalty.adjustBalance(admin.id, { clientId: client.id, amount: 5000 });

            const partial = await kit.loyalty.redeemBalance({ clientId: client.id, amountCents: 3000, orderTotalCents: 8000 });
            const rest = await kit.loyalty.redeemBalance({ clientId: client.id, amountCents: 2000, orderTotalCents: 2000 });

            assert.deepEqual(partial, { clientId: client.id, amount: -3000, balanceAfter: 2000 });
            assert.equal(rest.balanceAfter, 0);
            console.log("  OK: 3000 of an 8000 order, then the last 2000 of another");
        },
    },
    {
        title: "Balance cannot exceed the order total, the client's balance, or be zero",
        kind: "rejected",
        async run() {
            const kit = buildLoyalty();
            const { admin, client } = await seedLoyalty(kit, walletProgramInput());
            await kit.loyalty.adjustBalance(admin.id, { clientId: client.id, amount: 5000 });
            const redeem = (amountCents: number, orderTotalCents: number) =>
                () => kit.loyalty.redeemBalance({ clientId: client.id, amountCents, orderTotalCents });

            await expectRejected(redeem(4000, 3000), BalanceExceedsOrderTotalError);
            await expectRejected(redeem(6000, 8000), InsufficientBalanceError);
            await expectInvalidField(redeem(0, 8000), "amountCents");
            await expectInvalidField(redeem(10.5, 8000), "amountCents");
            assert.equal(await kit.loyalty.getBalance(client.id), 5000, "nothing was charged");
            console.log("  OK: over the total, over the balance, zero and fractions rejected");
        },
    },
    {
        title: "A cancelled order gets back exactly what it had redeemed",
        kind: "works",
        async run() {
            const kit = buildLoyalty();
            const { admin, client } = await seedLoyalty(kit, walletProgramInput());
            await kit.loyalty.adjustBalance(admin.id, { clientId: client.id, amount: 5000 });
            const redeemed = await kit.loyalty.redeemBalance({ clientId: client.id, amountCents: 3000, orderTotalCents: 8000 });

            const refunded = await kit.loyalty.refund({ clientId: client.id, amount: -redeemed.amount });

            assert.deepEqual(refunded, { clientId: client.id, amount: 3000, balanceAfter: 5000 });
            console.log("  OK: 3000 cents returned, balance back to 5000");
        },
    },
    {
        title: "A refund needs a positive whole amount and a real client",
        kind: "rejected",
        async run() {
            const kit = buildLoyalty();
            const { client } = await seedLoyalty(kit, walletProgramInput());

            await expectInvalidField(() => kit.loyalty.refund({ clientId: client.id, amount: 0 }), "amount");
            await expectInvalidField(() => kit.loyalty.refund({ clientId: client.id, amount: -5 }), "amount");
            await expectInvalidField(() => kit.loyalty.refund({ clientId: client.id, amount: 2.5 }), "amount");
            await expectRejected(() => kit.loyalty.refund({ clientId: "nobody", amount: 100 }), NotFoundError);
            assert.equal(await kit.loyalty.getBalance(client.id), 0);
            console.log("  OK: zero, negative, fraction and unknown client rejected");
        },
    },
    {
        title: "An administrator adjusts a balance up or down",
        kind: "works",
        async run() {
            const kit = buildLoyalty();
            const { admin, client } = await seedLoyalty(kit, visitProgramInput());

            const up = await kit.loyalty.adjustBalance(admin.id, { clientId: client.id, amount: 5 });
            const down = await kit.loyalty.adjustBalance(admin.id, { clientId: client.id, amount: -2 });

            assert.equal(up.balanceAfter, 5);
            assert.equal(down.balanceAfter, 3);
            console.log("  OK: +5 then -2 -> 3 points");
        },
    },
    {
        title: "Adjustments need an administrator, a real amount, and can never leave the balance below 0",
        kind: "rejected",
        async run() {
            const kit = buildLoyalty();
            const { admin, client } = await seedLoyalty(kit, visitProgramInput());
            await kit.loyalty.adjustBalance(admin.id, { clientId: client.id, amount: 2 });

            await expectInvalidField(() => kit.loyalty.adjustBalance(admin.id, { clientId: client.id, amount: 0 }), "amount");
            await expectInvalidField(() => kit.loyalty.adjustBalance(admin.id, { clientId: client.id, amount: 1.5 }), "amount");
            await expectRejected(() => kit.loyalty.adjustBalance(admin.id, { clientId: client.id, amount: -3 }), InsufficientBalanceError);
            await expectRejected(() => kit.loyalty.adjustBalance(client.id, { clientId: client.id, amount: 5 }), UnauthorizedActionError);
            await expectRejected(() => kit.loyalty.adjustBalance(admin.id, { clientId: "nobody", amount: 5 }), NotFoundError);
            assert.equal(await kit.loyalty.getBalance(client.id), 2, "only the first adjustment counted");
            console.log("  OK: zero, fraction, below zero, a client adjusting themselves and an unknown client rejected");
        },
    },
    {
        title: "Without an active program there is nothing to redeem or measure",
        kind: "rejected",
        async run() {
            const kit = buildLoyalty();
            const client = await kit.users.registerClient(clientInput());

            await expectRejected(() => kit.loyalty.redeemReward({ clientId: client.id }), NoActiveProgramError);
            await expectRejected(() => kit.loyalty.redeemBalance({ clientId: client.id, amountCents: 100, orderTotalCents: 500 }), NoActiveProgramError);
            await expectRejected(() => kit.loyalty.getProgress(client.id), NoActiveProgramError);
            console.log("  OK: three operations rejected with NoActiveProgramError");
        },
    },
    {
        title: "The client's loyaltyBalance field is the balance, always",
        kind: "works",
        async run() {
            const kit = buildLoyalty();
            const { admin, client } = await seedLoyalty(kit, walletProgramInput());

            await kit.loyalty.earnForOrder(delivered(client.id, "o1", 10000));
            await kit.loyalty.redeemBalance({ clientId: client.id, amountCents: 200, orderTotalCents: 3000 });
            await kit.loyalty.adjustBalance(admin.id, { clientId: client.id, amount: 50 });

            const stored = await kit.users.getClient(client.id);
            assert.equal(stored.loyaltyBalance, 350);
            assert.equal(await kit.loyalty.getBalance(client.id), 350);
            console.log("  OK: earn 500, redeem -200, adjust +50 -> loyaltyBalance 350");
        },
    },
];