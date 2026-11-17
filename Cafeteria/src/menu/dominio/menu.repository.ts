import { Beverage, DrinkType, Flavor, MenuOption, OptionKind } from './entidades';

export interface RecipeItemData {
    idIngredient: number;
    baseQuantity: number;
}

export interface IngredientReference {
    id: number;
    name: string;
}

export interface MenuRepository {
    findAllTypes(): Promise<DrinkType[]>;
    findDrinkType(id: number): Promise<DrinkType | null>;
    createDrinkType(name: string): Promise<DrinkType>;
    setTypeActive(id: number, isActive: boolean): Promise<DrinkType>;

    findFlavors(idDrinkType?: number): Promise<Flavor[]>;
    findFlavor(id: number): Promise<Flavor | null>;
    createFlavor(idDrinkType: number, name: string): Promise<Flavor>;
    setFlavorActive(id: number, isActive: boolean): Promise<Flavor>;

    findAllOptions(): Promise<MenuOption[]>;
    findOption(id: number): Promise<MenuOption | null>;
    createOption(kind: OptionKind, name: string, surcharge: number): Promise<MenuOption>;
    setOptionActive(id: number, isActive: boolean): Promise<MenuOption>;

    findAllBeverages(): Promise<Beverage[]>;
    findBeverage(id: number): Promise<Beverage | null>;
    createBeverage(datos: {
        name: string;
        idDrinkType: number;
        idFlavor: number;
        basePrice: number;
        allowsMilk: boolean;
    }): Promise<Beverage>;
    setBeverageActive(id: number, isActive: boolean): Promise<Beverage>;
    updateBeveragePrice(id: number, basePrice: number): Promise<Beverage>;

    findIngredient(id: number): Promise<IngredientReference | null>;
    // RN-03/RN-30: crear o reemplazar la receta no borra historial de pedidos.
    saveRecipe(idBeverage: number, items: RecipeItemData[]): Promise<Beverage>;
}

export const MENU_REPOSITORY = 'MENU_REPOSITORY';
