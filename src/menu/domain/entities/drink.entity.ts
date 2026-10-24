import { Product } from "./product.entity";

export interface Drink extends Product {
    drinkTypeId: string;
    drinkFlavorId: string;

}