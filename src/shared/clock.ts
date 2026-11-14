/** The domain asks the clock for "now" instead of using new Date(), so scenarios can control time. */
export interface Clock {
    now(): Date;
}

export class SystemClock implements Clock {
    now(): Date {
        return new Date();
    }
}