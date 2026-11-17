import { DomainError } from '../../comun/errores/dominio-error';

export class IngredientNotFoundError extends DomainError {
    constructor() {
        super('Insumo no encontrado.', 404);
    }
}

export class InvalidMovementQuantityError extends DomainError {
    constructor() {
        super('La cantidad debe ser mayor a cero (RN-29).', 400);
    }
}

export class InsufficientStockError extends DomainError {
    constructor(insumo: string) {
        super(`No hay existencia suficiente de '${insumo}' (RN-27).`, 409);
    }
}

export class EmptyMovementError extends DomainError {
    constructor() {
        super('Debe indicar al menos un insumo (RN-25).', 400);
    }
}

export class NegativeStockError extends DomainError {
    constructor() {
        super('La existencia de un insumo nunca puede quedar negativa (RN-28).', 409);
    }
}

export class MissingMovementReasonError extends DomainError {
    constructor() {
        super('Toda merma o ajuste requiere motivo y responsable (RN-30).', 400);
    }
}

export class InvalidAdjustmentValueError extends DomainError {
    constructor() {
        super('El ajuste debe ser distinto de cero (RN-30).', 400);
    }
}
