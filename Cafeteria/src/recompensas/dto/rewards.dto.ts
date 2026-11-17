import {
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    Length,
} from 'class-validator';
import { EarnMode, RedeemMode } from '../../ordenes/dominio/entidades';

export class ConfigureProgramDto {
    @IsString()
    @Length(1, 100)
    name!: string;

    @IsEnum(EarnMode)
    earnMode!: EarnMode;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    earnValue!: number;

    @IsEnum(RedeemMode)
    redeemMode!: RedeemMode;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    pointsPerReward!: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    pointValue!: number;
}

export class RedeemDto {
    @IsOptional()
    @IsInt()
    @IsPositive()
    idOrder?: number;
}

export class EarnDto {
    @IsInt()
    @IsPositive()
    idClient!: number;

    @IsOptional()
    @IsInt()
    @IsPositive()
    idOrder?: number;

    // RN-41: la parte pagada con puntos o gratis no genera puntos nuevos.
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    eligibleAmount?: number;
}

export class AdjustPointsDto {
    @IsInt()
    @IsPositive()
    idClient!: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    points!: number;

    @IsString()
    @Length(1, 200)
    reason!: string;

    @IsString()
    @Length(1, 100)
    responsible!: string;
}

export class ReverseDto {
    @IsInt()
    @IsPositive()
    idOrder!: number;

    @IsString()
    @Length(1, 200)
    reason!: string;
}
