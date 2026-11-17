import { ETIQUETAS_ESTADO, PedidoParaEstado } from '../dominio/entidades';

export interface OrderStatusResponseDto {
  id: number;
  status: string;
  label: string;
  total: number;
  idClient: number;
}

export function toStatusResponse(pedido: PedidoParaEstado): OrderStatusResponseDto {
  const status = pedido.status as keyof typeof ETIQUETAS_ESTADO;
  return {
    id: pedido.id,
    status: pedido.status,
    label: ETIQUETAS_ESTADO[status] ?? pedido.status,
    total: Number(pedido.total),
    idClient: pedido.idClient,
  };
}

export interface RepeatedDetailDto {
  idProduct: number;
  quantity: number;
  previousPrice: number;
  currentPrice: number;
  isActive: boolean;
}

export interface RepeatOrderResponseDto {
  idClient: number;
  details: RepeatedDetailDto[];
  total: number;
  warnings: string[];
}
