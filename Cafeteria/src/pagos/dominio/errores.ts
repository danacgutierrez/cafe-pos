import { DomainError } from '../../comun/errores/dominio-error';

export class OrderNotFoundError extends DomainError {
    constructor() {
        super('Pedido no encontrado.', 404);
    }
}

export class PaymentNotFoundError extends DomainError {
    constructor() {
        super('Pago no encontrado.', 404);
    }
}

export class UnauthorizedPaymentError extends DomainError {
    constructor() {
        super('Solo el staff o la dueña pueden confirmar pagos en efectivo o transferencia (RN-20).', 403);
    }
}

export class MissingPaymentReferenceError extends DomainError {
    constructor() {
        super('El pago con tarjeta requiere una referencia del proveedor (RN-21).', 400);
    }
}

export class PaymentAlreadyProcessedError extends DomainError {
    constructor() {
        super('Ese pago ya fue aprobado (RN-23).', 409);
    }
}

export class InvalidPaymentStatusError extends DomainError {
    constructor() {
        super('No se puede cambiar el estado de ese pago.', 409);
    }
}
