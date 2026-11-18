import {
    ArrayNotEmpty,
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    Length,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OptionKind } from '../dominio/entidades';

export class CreateDrinkTypeDto {
    @IsString()
    @Length(1, 100)
    name!: string;
}

export class CreateFlavorDto {
    @IsInt()
    @IsPositive()
    idDrinkType!: number;

    @IsString()
    @Length(1, 100)
    name!: string;
}

export class CreateOptionDto {
    @IsEnum(OptionKind)
    kind!: OptionKind;

    @IsString()
    @Length(1, 100)
    name!: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    surcharge!: number;
}

export class CreateBeverageDto {
    @IsString()
    @Length(1, 100)
    name!: string;

    @IsInt()
    @IsPositive()
    idDrinkType!: number;

    @IsInt()
    @IsPositive()
    idFlavor!: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    basePrice!: number;

    @IsOptional()
    @IsBoolean()
    allowsMilk?: boolean;
}

export class CustomizationDto {
    @IsOptional()
    @IsInt()
    @IsPositive()
    sizeId?: number;

    @IsOptional()
    @IsInt()
    @IsPositive()
    milkId?: number;

    @IsOptional()
    @IsInt()
    @IsPositive()
    sweetenerId?: number;

    // RN-06: 0 % a 100 %, solo si hay endulzante.
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    sweetness?: number;

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    @IsPositive({ each: true })
    extraIds?: number[];

    // Nota libre del cliente (ej. "poco hielo"). No afecta al precio.
    @IsOptional()
    @IsString()
    @Length(1, 200)
    note?: string;
}

export class QuoteDto {
    @IsInt()
    @IsPositive()
    idBeverage!: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => CustomizationDto)
    customization?: CustomizationDto;
}

export class SetActiveDto {
    @IsBoolean()
    isActive!: boolean;
}

export class UpdatePriceDto {
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    basePrice!: number;
}

export class RecipeItemDto {
    @IsInt()
    @IsPositive()
    idIngredient!: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    baseQuantity!: number;
}

export class SaveRecipeDto {
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => RecipeItemDto)
    items!: RecipeItemDto[];
}
