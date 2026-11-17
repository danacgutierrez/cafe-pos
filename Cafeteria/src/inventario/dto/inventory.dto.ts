import {
    ArrayNotEmpty,
    IsArray,
    IsInt,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    Length,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterEntryDto {
    @IsInt()
    @IsPositive()
    idIngredient!: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive() // RN-29: cero o negativo no se permite
    quantity!: number;

    @IsOptional()
    @IsString()
    reason?: string;
}

export class ConsumptionItemDto {
    @IsInt()
    @IsPositive()
    idIngredient!: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    quantity!: number;
}

export class MoveStockDto {
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => ConsumptionItemDto)
    movements!: ConsumptionItemDto[];

    @IsOptional()
    @IsString()
    reason?: string;
}

export class SetMinStockDto {
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    minStock!: number;
}

export class RegisterWasteDto {
    @IsInt()
    @IsPositive()
    idIngredient!: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    quantity!: number;

    @IsString()
    @Length(1, 200)
    reason!: string;
}

export class AdjustStockDto {
    @IsInt()
    @IsPositive()
    idIngredient!: number;

    // Con signo: positivo entra, negativo sale (RN-30).
    @IsNumber({ maxDecimalPlaces: 2 })
    quantity!: number;

    @IsString()
    @Length(1, 200)
    reason!: string;
}
