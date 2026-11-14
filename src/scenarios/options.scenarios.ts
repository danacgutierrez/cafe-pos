import assert from "node:assert/strict";
import { DuplicateSweetenerLevelError } from "../menu/domain/errors";
import { MAX_EXTRA_QUANTITY, MAX_SWEETENER_LEVEL } from "../menu/domain/limits";
import { expectInvalidField, expectRejected } from "./helpers";
import { Scenario } from "./scenario";
import { buildMenu } from "./setup";

export const optionScenarios: Scenario[] = [
    {
        title: "Sizes, milks, sweeteners and extras are created active",
        kind: "works",
        async run() {
            const { options } = buildMenu();

            const size = await options.createSize("Small", 0);
            const milk = await options.createMilkType("Whole milk", 0);
            const sweetener = await options.createSweetener("Light", 1, 0);
            const extra = await options.createExtra("Cold foam", 1200, 2);

            for (const option of [size, milk, sweetener, extra]) {
                assert.ok(option.id.length > 0);
                assert.equal(option.isActive, true);
            }
            assert.equal(sweetener.level, 1);
            assert.equal(extra.maxQuantity, 2);
            console.log("  OK: the four catalogs created their first records");
        },
    },
    {
        title: "A sweetener level must be a unique whole number in range",
        kind: "rejected",
        async run() {
            const { options, sweeteners } = buildMenu();
            await options.createSweetener("Light", 1, 0);

            const error = await expectRejected(() => options.createSweetener("Sweet", 1, 0), DuplicateSweetenerLevelError);
            await expectInvalidField(() => options.createSweetener("Sweet", -1, 0), "level");
            await expectInvalidField(() => options.createSweetener("Sweet", 1.5, 0), "level");
            await expectInvalidField(() => options.createSweetener("Sweet", MAX_SWEETENER_LEVEL + 1, 0), "level");
            assert.equal((await sweeteners.findAll()).length, 1, "nothing else must be saved");
            console.log("  OK: rejected ->", error.message);
        },
    },
    {
        title: "An extra maximum must be a whole number from 1 up to the limit",
        kind: "rejected",
        async run() {
            const { options, extras } = buildMenu();

            await expectInvalidField(() => options.createExtra("Shot", 1500, 0), "maxQuantity");
            await expectInvalidField(() => options.createExtra("Shot", 1500, 2.5), "maxQuantity");
            await expectInvalidField(() => options.createExtra("Shot", 1500, MAX_EXTRA_QUANTITY + 1), "maxQuantity");
            assert.equal((await extras.findAll()).length, 0, "nothing must be saved");

            const shot = await options.createExtra("Shot", 1500, MAX_EXTRA_QUANTITY);
            assert.equal(shot.maxQuantity, MAX_EXTRA_QUANTITY);
            console.log("  OK: invalid maximums rejected, exact limit accepted");
        },
    },
];
