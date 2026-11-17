import { IsEnum, IsInt, IsPositive } from 'class-validator';
import { OrderStatus } from '../../ordenes/dominio/entidades';

export class ChangeStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

export class RepeatOrderDto {
  @IsInt()
  @IsPositive()
  idClient!: number;
}
