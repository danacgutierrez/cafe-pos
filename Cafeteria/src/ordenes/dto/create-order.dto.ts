import {
  IsInt,
  IsArray,
  IsPositive,
  ArrayNotEmpty,
  ValidateNested,
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderDetailDto } from './create-order-detail.dto';
import { DeliveryMode, FulfillmentType } from '../dominio/entidades';

export class CreateOrderDto {
  @IsInt()
  @IsPositive()
  idClient!: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderDetailDto)
  details!: CreateOrderDetailDto[];

  @IsDateString()
  @IsOptional()
  scheduleTime?: string; // O Date (en JSON viaja como string ISO 8601)

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  deliveryNotes?: string;

  @IsEnum(DeliveryMode)
  deliveryMode!: DeliveryMode;

  @IsEnum(FulfillmentType)
  fulfillmentType!: FulfillmentType;

  @IsInt()
  @IsPositive()
  @IsOptional()
  idLoyaltyTransaction?: number;

  @IsBoolean()
  @IsOptional()
  usePoints?: boolean;

  @IsInt()
  @IsPositive()
  @IsOptional()
  rewardProductId?: number;
}