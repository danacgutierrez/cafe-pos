/**
 * Lets Location ask "does anything depend on this location?" without importing
 * Staff, Orders or Inventory (the dependency only goes from them to Location).
 * Owned by Location; each of those modules will plug its own check into the real implementation.
 */
export interface LocationUsageChecker {
    /** True if any staff member, order or inventory item references the location. */
    isInUse(locationId: string): Promise<boolean>;
}