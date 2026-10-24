export const NAME_MAX_LENGTH = 50;
export const DESCRIPTION_MAX_LENGTH = 300;
export const IMAGE_URL_MAX_LENGTH = 2048;

// The three below are technical guards (typing mistakes, database column sizes),
// not business rules from the client. Provisional.
export const MAX_PRICE_CENTS = 1_000_000; // $10,000.00 MXN; applies to each component AND to the total of a drink
export const MAX_EXTRA_QUANTITY = 10;      // highest value an extra's maxQuantity can have
export const MAX_SWEETENER_LEVEL = 10;     // highest sweetness level
