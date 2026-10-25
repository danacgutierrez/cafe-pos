/** A physical branch of the business. Staff, orders and inventory belong to a location. */
export interface Location {
    readonly id: string;
    /** Unique among locations, ignoring case. */
    name: string;
    address: string;
}