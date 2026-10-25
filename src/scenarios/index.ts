/**
 * Domain scenarios for the menu module. Run with `npm run dev`.
 *
 * Each file groups one theme; setup.ts is the only one that knows the
 * in-memory repositories. Scenarios marked `main` are the three the
 * delivery highlights (one that works and two that are rejected).
 */
import { availabilityScenarios } from "./availability.scenarios";
import { deletionScenarios } from "./deletion.scenarios";
import { drinkScenarios } from "./drinks.scenarios";
import { optionScenarios } from "./options.scenarios";
import { Scenario } from "./scenario";
import { locationScenarios } from "./location.scenarios";
import { userScenarios } from "./user.scenarios";
import { loyaltyScenarios } from "./loyalty.scenarios";

const scenarios: Scenario[] = [
    ...drinkScenarios,
    ...optionScenarios,
    ...availabilityScenarios,
    ...deletionScenarios,
    ...locationScenarios,
    ...userScenarios,
    ...loyaltyScenarios,
];

async function main(): Promise<void> {
    for (const [index, scenario] of scenarios.entries()) {
        const tags = `${scenario.kind}${scenario.main ? ", MAIN" : ""}`;
        console.log(`\n=== Scenario ${index + 1} (${tags}): ${scenario.title} ===`);
        await scenario.run();
    }

    console.log(`\nAll ${scenarios.length} scenarios passed.`);
    console.log("Main scenarios:");
    for (const [index, scenario] of scenarios.entries()) {
        if (scenario.main) {
            console.log(`  ${index + 1}. (${scenario.kind}) ${scenario.title}`);
        }
    }
}

main().catch((error: unknown) => {
    console.error("\nFAILED:", error);
    process.exitCode = 1;
});
