import { Order } from "../dominio/entidades";
import { OrderStatus, DeliveryMode, FulfillmentType } from "../dominio/entidades";
import { OrderDetailResponseDto } from "./order-detail-response.dto";
import { toOrderDetailDto } from "./order-detail-response.dto"; 

export interface OrderResponseDto {
  id: number;
  scheduleTime?: string;
  notes?: string;
  total: number;
  deliveryNotes?: string;
  deliveryMode: string;
  deliveryFee: number;
  status: string;
  fulfillmentType: string;
  createdAt: string;

  idClient: number;
  idLoyaltyTransaction?: number;
  orderDetails: OrderDetailResponseDto[];
}

export function toOrderDto(order: Order): OrderResponseDto {
  return {
    id: order.id,
    scheduleTime: order.scheduleTime ? order.scheduleTime.toISOString() : undefined,
    notes: order.notes,
    total: Number(order.total),
    deliveryNotes: order.deliveryNotes,
    deliveryMode: order.deliveryMode,
    deliveryFee: Number(order.deliveryFee),
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    createdAt: order.createdAt.toISOString(),
    idClient: order.idClient,
    idLoyaltyTransaction: order.idLoyaltyTransaction,
    orderDetails: order.orderDetails ? order.orderDetails.map(toOrderDetailDto) : [],
  };
}