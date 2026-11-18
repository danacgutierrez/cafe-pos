// Entidades del menú. Tipos, sabores y opciones son DATOS (RN-08):
// la dueña los agrega desde la API sin cambiar este código.
export enum OptionKind {
    SIZE = 'SIZE',
    MILK = 'MILK',
    SWEETENER = 'SWEETENER',
    EXTRA = 'EXTRA',
}

export class DrinkType {
    id!: number;
    name!: string;
    isActive!: boolean;
}

export class Flavor {
    id!: number;
    idDrinkType!: number;
    name!: string;
    isActive!: boolean;
}

export class MenuOption {
    id!: number;
    kind!: OptionKind;
    name!: string;
    surcharge!: number;
    isActive!: boolean;
}

export class Recipe {
    id!: number;
    idBeverage!: number;
    hasItems!: boolean;
}

export class Beverage {
    id!: number;
    name!: string;
    idDrinkType!: number;
    idFlavor!: number;
    basePrice!: number;
    isActive!: boolean;
    allowsMilk!: boolean;
    recipe?: Recipe | null;
}

// Elecciones del cliente sobre una bebida (glosario: personalización).
export interface Customization {
    sizeId?: number;
    milkId?: number;
    sweetenerId?: number;
    sweetness?: number;
    extraIds?: number[];
}

export interface Quote {
    idBeverage: number;
    basePrice: number;
    surcharges: number;
    total: number;
    breakdown: string[];
    warnings: string[];
}
