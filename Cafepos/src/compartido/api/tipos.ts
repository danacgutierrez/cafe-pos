// tipos.ts — la forma de lo que regresa cafepos-backend.
// Se usan uniones de texto en lugar de enum: con `erasableSyntaxOnly`
// un enum no se puede borrar en compilación. El backend usa los mismos valores.

/* ---------- sesión ---------- */
export type Rol = 'client' | 'staff' | 'admin';

// Lo que viene en GET /auth/yo (el contenido del JWT).
export interface PayloadJwt {
  sub: number;
  correo: string;
  rol: Rol;
  idClient: number | null;
}

export interface Sesion {
  token: string;
  usuario: PayloadJwt;
}

// POST /auth/login y /auth/registro regresan esto; /auth/yo da el usuario.
export interface TokenRespuesta {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/* ---------- catálogo ---------- */
export type OptionKind = 'SIZE' | 'MILK' | 'SWEETENER' | 'EXTRA';

export interface DrinkType {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Flavor {
  id: number;
  idDrinkType: number;
  name: string;
  isActive: boolean;
}

export interface MenuOption {
  id: number;
  kind: OptionKind;
  name: string;
  surcharge: number;
  isActive: boolean;
}

export interface Recipe {
  id: number;
  idBeverage: number;
  hasItems: boolean;
}

export interface Beverage {
  id: number;
  name: string;
  idDrinkType: number;
  idFlavor: number;
  basePrice: number;
  isActive: boolean;
  allowsMilk: boolean;
  recipe?: Recipe | null;
}

export interface Catalogo {
  drinkTypes: DrinkType[];
  flavors: Flavor[];
  options: MenuOption[];
  beverages: Beverage[];
}

// Elecciones del cliente sobre una bebida (POST /menu/quote).
export interface Personalizacion {
  sizeId?: number;
  milkId?: number;
  sweetenerId?: number;
  sweetness?: number;
  extraIds?: number[];
  note?: string;
}

export interface Cotizacion {
  idBeverage: number;
  basePrice: number;
  surcharges: number;
  total: number;
  breakdown: string[];
  warnings: string[];
}

export interface Producto {
  id: number;
  name: string;
  price: number;
  description: string;
  isActive: boolean;
}

/* ---------- carrito ---------- */
export interface ItemCarrito {
  clave: string;
  tipo: 'producto' | 'bebida';
  id: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  personalizacion?: Personalizacion;
  descripcion?: string;
}

/* ---------- pedidos ---------- */
export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type DeliveryMode = 'PICKUP' | 'DELIVERY';
export type FulfillmentType = 'IMMEDIATE' | 'SCHEDULED';

export interface DetallePedido {
  id: number;
  quantity: number;
  price: number;
  idProduct?: number;
  idBeverage?: number;
  customization?: Personalizacion;
}

export interface Pedido {
  id: number;
  scheduleTime?: string;
  notes?: string;
  total: number;
  deliveryNotes?: string;
  deliveryMode: DeliveryMode;
  deliveryFee: number;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  createdAt: string;
  idClient: number;
  orderDetails: DetallePedido[];
}

export interface DetalleNuevo {
  idProduct?: number;
  idBeverage?: number;
  quantity: number;
  customization?: Personalizacion;
}

export interface CrearPedido {
  idClient: number;
  details: DetalleNuevo[];
  deliveryMode: DeliveryMode;
  fulfillmentType: FulfillmentType;
  scheduleTime?: string;
  notes?: string;
  deliveryNotes?: string;
  usePoints?: boolean;
  rewardProductId?: number;
}

export interface EstadoPedido {
  id: number;
  status: OrderStatus;
  label: string;
  total: number;
  idClient: number;
}

export interface DetalleRepetido {
  idProduct?: number;
  idBeverage?: number;
  quantity: number;
  previousPrice: number;
  currentPrice: number;
  isActive: boolean;
}

export interface RepeticionPedido {
  idClient: number;
  details: DetalleRepetido[];
  total: number;
  warnings: string[];
}

/* ---------- pagos ---------- */
export type PaymentMethod = 'CARD' | 'CASH' | 'TRANSFER';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';

export interface Pago {
  id: number;
  idOrder: number;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  providerPaymentId?: string | null;
  createdAt: string;
}

export interface ResumenPago {
  idOrder: number;
  paid: boolean;
  total: number;
  approved: number;
}

/* ---------- recompensas ---------- */
export interface MisPuntos {
  balance: number;
  pointsPerReward: number;
  missing: number;
  canRedeem: boolean;
}

export type TransactionType = 'EARN' | 'REDEEM' | 'REVERSE' | 'ADJUST';

export interface Movimiento {
  id: number;
  idClient: number;
  idLoyaltyProgram: number;
  idOrder?: number | null;
  transactionType: TransactionType;
  pointsEarned: number;
  balanceAfter: number;
  reason?: string | null;
  responsible?: string | null;
  createdAt: string;
}

export interface ProgramaRecompensa {
  id: number;
  name: string;
  isActive: boolean;
  earnMode: 'PER_ORDER' | 'AMOUNT_SPENT';
  earnValue: number;
  redeemMode: 'DISCOUNT' | 'FREE_ITEM';
  pointsPerReward: number;
  pointValue: number;
}

export interface PlanRecompensa {
  puntosADescontar: number;
  saldoNuevo: number;
  programa: ProgramaRecompensa;
}
