// Lets Menu ask "has this ever been used in an order?" without depending
// on the Orders module directly — Orders doesn't exist yet, and Menu must never depend on it
// (the dependency only goes Orders -> Menu). The real implementation will live in
// infrastructure once Orders exists; for now AlwaysUnusedChecker stands in for it.
export interface UsageChecker {
  isReferencedInOrders(entityType: "drink" | "size" | "milkType" | "sweetener" | "flavor" | "drinkType", "extra", id: string): Promise<boolean>;
}