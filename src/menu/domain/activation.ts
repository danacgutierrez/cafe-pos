import { NotFoundError } from "../../shared/not-found-error";

/** The minimum a repository must offer to be activated or deactivated. */
export interface ActivatableRepository<T extends { id: string; isActive: boolean }> {
    findById(id: string): Promise<T | null>;
    save(entity: T): Promise<T>;
}

/** Turns a record on or off. Doing it twice is harmless and returns the record untouched. */
export async function setActive<T extends { id: string; isActive: boolean }>(
    repository: ActivatableRepository<T>,
    entityName: string,
    id: string,
    isActive: boolean,
): Promise<T> {
    const entity = await repository.findById(id);
    if (!entity) {
        throw new NotFoundError(entityName, id);
    }
    if (entity.isActive === isActive) {
        return entity;
    }
    return repository.save({ ...entity, isActive });
}
