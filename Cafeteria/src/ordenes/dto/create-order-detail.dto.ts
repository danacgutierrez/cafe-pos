import {
  IsInt,
  IsPositive,
} from 'class-validator';

export class CreateOrderDetailDto {
  @IsInt()
  @IsPositive()
  idProduct!: number;

  @IsInt()
  @IsPositive()
  quantity!: number;
}
