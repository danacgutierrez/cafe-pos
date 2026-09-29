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