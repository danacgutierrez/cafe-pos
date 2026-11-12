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
export class ProductNotFoundError extends DomainError {
    constructor(productId: number) {
        super(`El producto con ID ${productId} no existe en el catálogo.`);
        this.name = "ProductNotFoundError";
    }
}

export class InvalidQuantityError extends DomainError {
    constructor() {
        super("La cantidad debe ser un número entero mayor que cero.");
        this.name = "InvalidQuantityError";
    }
}

export class InvalidProductPriceError extends DomainError {
    constructor(productId: number) {
        super(`El producto con ID ${productId} tiene un precio inválido.`);
        this.name = "InvalidProductPriceError";
    }
}