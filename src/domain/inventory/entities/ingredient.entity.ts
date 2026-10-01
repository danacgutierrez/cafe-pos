/** Ingredient represents what is needed for the creation of a drink/product 
*/

export type MeasurementUnit = 'mililiters' | 'grams' | 'unit';

export interface Ingredient {
    readonly id: string;
    name: string;
    measureType: MeasurementUnit;
    currentStock: number;
    minStock: number;
}