import { DomainError } from '../../comun/errores/dominio-error';

export class FlavorNotAllowedError extends DomainError {
    constructor() {
        super('El sabor no está habilitado para ese tipo de bebida (RN-01).', 409);
    }
}

export class DisabledOptionError extends DomainError {
    constructor(opcion: string) {
        super(`La opción '${opcion}' está desactivada y no forma parte del menú (RN-02).`, 409);
    }
}

export class BeverageWithoutRecipeError extends DomainError {
    constructor() {
        super('No se puede activar una bebida sin receta (RN-03).', 409);
    }
}

export class BeverageNotFoundError extends DomainError {
    constructor() {
        super('Bebida no encontrada.', 404);
    }
}

export class MenuOptionNotFoundError extends DomainError {
    constructor(opcion: string) {
        super(`Opción '${opcion}' no encontrada.`, 404);
    }
}

export class InvalidSweetnessError extends DomainError {
    constructor() {
        super('El nivel de dulzor solo aplica si se eligió un endulzante (RN-06).', 400);
    }
}

export class MilkNotAllowedError extends DomainError {
    constructor() {
        super('Esa bebida no admite leche (RN-06).', 409);
    }
}

export class DrinkTypeNotFoundError extends DomainError {
    constructor() {
        super('Tipo de bebida no encontrado.', 404);
    }
}

export class FlavorNotFoundError extends DomainError {
    constructor() {
        super('Sabor no encontrado.', 404);
    }
}

export class EmptyRecipeError extends DomainError {
    constructor() {
        super('La receta debe tener al menos un insumo (RN-03).', 400);
    }
}

export class IngredientNotFoundError extends DomainError {
    constructor() {
        super('Insumo no encontrado.', 404);
    }
}
