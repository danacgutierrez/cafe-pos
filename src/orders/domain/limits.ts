import { LOCATION_ADDRESS_MAX_LENGTH } from "../../location/domain/limits";

export const ORDER_NOTES_MAX_LENGTH = 200;
// Same limit as a location's address, since a delivery address is a place of the same kind.
export const DELIVERY_ADDRESS_MAX_LENGTH = LOCATION_ADDRESS_MAX_LENGTH;

// Provisional: the business has not set these yet. They are technical guards
// against typing mistakes, not business rules.
export const ORDER_ITEMS_MAX = 20;           // lines in one order
export const ITEM_QUANTITY_MAX = 10;         // units of the same configured drink in one line
export const DELIVERY_FEE_MAX_CENTS = 50_000;     // $500.00 MXN
export const ORDER_TOTAL_MAX_CENTS = 5_000_000;   // $50,000.00 MXN

// Provisional: until Location has opening hours, these are the only limits on scheduleTime.
export const SCHEDULE_MIN_LEAD_MINUTES = 10; // time needed to prepare
export const SCHEDULE_MAX_DAYS_AHEAD = 7;