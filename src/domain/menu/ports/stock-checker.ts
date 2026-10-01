export interface StockChecker {
  hasEnoughStock(drinkId: string): Promise<boolean>;
}