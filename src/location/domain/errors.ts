import { DomainError } from "../../shared/domain-error";

// a location with staff, orders or inventory attached cannot disappear without
// leaving those records pointing at nothing.
export class LocationInUseError extends DomainError {
    constructor(readonly locationId: string) {
        super(`Cannot delete location "${locationId}" because it still has staff, orders or inventory`);
    }
}