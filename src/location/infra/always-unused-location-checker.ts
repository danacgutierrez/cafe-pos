import { LocationUsageChecker } from "../domain/location-usage-checker.js";

export class AlwaysUnusedLocationChecker implements LocationUsageChecker {
  async isInUse(): Promise<boolean> {
    return false;
  }
}