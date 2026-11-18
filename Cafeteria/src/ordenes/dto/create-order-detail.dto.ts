import {
  IsInt,
  IsPositive,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomizationDto } from '../../menu/dto/menu.dto';

// Cada línea se origina en el catálogo (idProduct) o en el menú
// personalizable (idBeverage + customization). El servicio valida que
// llegue exactamente una de las dos referencias.
export class CreateOrderDetailDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  idProduct?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  idBeverage?: number;

  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomizationDto)
  customization?: CustomizationDto;
}
