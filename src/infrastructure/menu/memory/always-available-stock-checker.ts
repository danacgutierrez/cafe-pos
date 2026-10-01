import { StockChecker } from "../../../domain/menu/ports/stock-checker.js";

export class AlwaysAvailableStockChecker implements StockChecker {
  async hasEnoughStock(): Promise<boolean> {
    return true;
  }
}