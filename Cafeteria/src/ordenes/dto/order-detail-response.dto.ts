import { OrderDetail } from "../dominio/entidades";

export interface OrderDetailResponseDto {
  id: number;
  quantity: number;
  price: number;
  idProduct: number;
}

export function toOrderDetailDto(detail: OrderDetail): OrderDetailResponseDto {
  const price = Number(detail.price);
  return {
    id: detail.id,
    idProduct: detail.idProduct,
    quantity: detail.quantity,
    price,
  };
}