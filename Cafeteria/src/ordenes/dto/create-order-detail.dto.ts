import {
  IsInt,
  IsNumber,
  IsPositive,
} from 'class-validator';

export class CreateOrderDetailDto {
  @IsInt()
  @IsPositive()
  idProduct!: number;

  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price!: number;
}