import { DomainError } from '../../comun/errores/dominio-error';

export class MultipleFreeDrinksError extends DomainError {
    constructor() {
        super('Solo se puede canjear una bebida gratis por pedido (RN-40).', 409);
    }
}

export class InvalidPointsAdjustmentError extends DomainError {
    constructor() {
        super('El ajuste dejaría el saldo negativo (RN-39).', 409);
    }
}

export class MissingPointsReasonError extends DomainError {
    constructor() {
        super('Todo ajuste de puntos requiere motivo y responsable (RN-44).', 400);
    }
}

export class AlreadyReversedError extends DomainError {
    constructor() {
        super('Los puntos de ese pedido ya fueron revertidos (RN-42).', 409);
    }
}

export class InvalidAdjustmentValueError extends DomainError {
    constructor() {
        super('El ajuste debe ser distinto de cero (RN-44).', 400);
    }
}
