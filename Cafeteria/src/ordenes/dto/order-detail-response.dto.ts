import { OrderDetail } from "../dominio/entidades";
import { CustomizationDto } from "../../menu/dto/menu.dto";

export interface OrderDetailResponseDto {
  id: number;
  quantity: number;
  price: number;
  idProduct?: number;
  idBeverage?: number;
  customization?: CustomizationDto;
}

export function toOrderDetailDto(detail: OrderDetail): OrderDetailResponseDto {
  const price = Number(detail.price);
  return {
    id: detail.id,
    idProduct: detail.idProduct,
    idBeverage: detail.idBeverage,
    customization: detail.customization
      ? (JSON.parse(detail.customization) as CustomizationDto)
      : undefined,
    quantity: detail.quantity,
    price,
  };
}
