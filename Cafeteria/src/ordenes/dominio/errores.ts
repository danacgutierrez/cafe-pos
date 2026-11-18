import { DomainError } from '../../comun/errores/dominio-error';

export { DomainError } from '../../comun/errores/dominio-error';

export class EmptyOrderError extends DomainError {
    constructor() {
        super("No se puede procesar un pedido sin productos.");
    }
}

export class InvalidOrderDetailError extends DomainError {
    constructor() {
        super("Cada línea debe indicar idProduct o idBeverage, pero no ambos.", 400);
    }
}

export class InactiveProductError extends DomainError {
    constructor(productName: string) {
        super(`El producto '${productName}' se encuentra inactivo y no puede ser vendido.`);
    }
}

export class NonExistentProductError extends DomainError {
    constructor() {
        super(`El producto no existe en el catálogo.`);
    }
}

export class InvalidOrderStatusError extends DomainError {
    constructor() {
        super(`No es posible modificar el status de la orden.`);
    }
}

export class NonOrderFoundError extends DomainError {
    constructor() {
        super(`Orden no encontrada.`);
    }
}

export class NonClientFoundError extends DomainError {
    constructor() {
        super(`Cliente no encontrado.`);
    }
}

export class NoActiveLoyaltyProgramError extends DomainError {
    constructor() {
        super(`No hay un programa de lealtad activo.`);
    }
}

export class InsufficientPointsError extends DomainError {
    constructor() {
        super(`No tienes suficientes puntos para canjear.`);
    }
}

export class InvalidPointsToEarn extends DomainError {
    constructor() {
        super(`Puntos de entrega invalidos.`);
    }
}

// RN-51: dos clientes no pueden compartir el mismo telefono.
export class DuplicatePhoneError extends DomainError {
    constructor() {
        super(`El teléfono ya está registrado (RN-51).`);
    }
}
