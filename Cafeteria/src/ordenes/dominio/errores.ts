export class DomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DomainError";
    }
}

export class EmptyOrderError extends DomainError {
    constructor() {
        super("No se puede procesar un pedido sin productos.");
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

export class InvalidPointsToEarn extends DomainError {
    constructor() {
        super(`Puntos de entrega invalidos.`);
    }
}

export class NonClientFoundError extends DomainError {
    constructor() {
        super(`Cliente no encontrado.`);
    }
}

