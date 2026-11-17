import { Beverage, DrinkType, Flavor, MenuOption, Quote } from '../dominio/entidades';

export interface MenuResponseDto {
    drinkTypes: DrinkType[];
    flavors: Flavor[];
    options: MenuOption[];
    beverages: Beverage[];
}

export function toMenuResponse(
    drinkTypes: DrinkType[],
    flavors: Flavor[],
    options: MenuOption[],
    beverages: Beverage[],
): MenuResponseDto {
    return { drinkTypes, flavors, options, beverages };
}

export type QuoteResponseDto = Quote;
