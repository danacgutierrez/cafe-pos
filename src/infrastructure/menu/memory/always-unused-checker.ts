import { UsageChecker } from "../../../domain/menu/ports/usage-checker.js";

export class AlwaysUnusedChecker implements UsageChecker {
  async isReferencedInOrders(): Promise<boolean> {
    return false;
  }
}