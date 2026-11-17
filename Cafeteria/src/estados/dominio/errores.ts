import { DomainError } from '../../comun/errores/dominio-error';

export class InvalidStatusTransitionError extends DomainError {
  constructor(actual: string, destino: string) {
    super(`No se puede avanzar de '${actual}' a '${destino}' (RN-12).`, 409);
  }
}

export class UnauthorizedStatusChangeError extends DomainError {
  constructor() {
    super('Solo el staff o la dueña pueden cambiar el estado (RN-13).', 403);
  }
}

export class OrderAlreadyFinalError extends DomainError {
  constructor() {
    super('El pedido ya está entregado o cancelado y no se puede modificar (RN-15).', 409);
  }
}

export class ClientNotFoundError extends DomainError {
  constructor() {
    super('El cliente no tiene una cuenta asociada.', 400);
  }
}

export class PaymentNotApprovedError extends DomainError {
  constructor() {
    super('El pago con tarjeta todavía no fue aprobado (RN-19).', 409);
  }
}
