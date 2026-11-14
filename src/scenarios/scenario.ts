/**
 * One domain scenario. "works" shows a rule letting something through,
 * "rejected" shows a rule stopping it. `main` marks the three that the
 * delivery highlights (one that works and two that are rejected).
 */
export interface Scenario {
    title: string;
    kind: "works" | "rejected";
    main?: boolean;
    run: () => Promise<void>;
}
