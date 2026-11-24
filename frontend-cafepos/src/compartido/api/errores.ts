// compartido/api/errores.ts — traduce lo que dice el servicio a lenguaje de
// la persona. Las reglas de negocio ya llegan en español; los mensajes de
// class-validator (técnicos y en inglés) se convierten aquí, una sola vez.

interface ErrorApi {
  response?: { status?: number; data?: unknown };
  config?: { url?: string };
}

function comoErrorApi(e: unknown): ErrorApi | null {
  if (typeof e !== 'object' || e === null) return null;
  const candidato = e as Partial<ErrorApi>;
  if (!candidato.response && !candidato.config) return null;
  return candidato as ErrorApi;
}

function mensajesDelServicio(e: unknown): string[] {
  const error = comoErrorApi(e);
  const datos = error?.response?.data as { message?: unknown } | undefined;
  const mensaje = datos?.message;
  if (Array.isArray(mensaje)) return mensaje.filter((m): m is string => typeof m === 'string');
  return typeof mensaje === 'string' ? [mensaje] : [];
}

// Reglas de traducción. Se aplican en orden; la primera que coincide gana.
const TRADUCCIONES: [RegExp, (coincidencia: RegExpMatchArray) => string][] = [
  [/credenciales?\s*inv[aá]lidas?/i, () => 'Correo o contraseña incorrectos.'],
  [/customization\.note|note\s+must\s+be\s+longer/i, () => 'La nota especial debe tener entre 1 y 200 caracteres.'],
  [/(?:correo|email)\s+must\s+be\s+an\s+email|must\s+be\s+an\s+email/i, () => 'Escribe un correo electrónico válido.'],
  [/password\s+must\s+be\s+longer\s+than\s+or\s+equal\s+to\s+(\d+)/i, (m) => `La contraseña debe tener al menos ${m[1]} caracteres.`],
  [/firstName|first\s+name/i, () => 'Escribe tu nombre.'],
  [/lastName|last\s+name/i, () => 'Escribe tu apellido.'],
  [/phoneNumber|phone/i, () => 'Escribe un teléfono válido.'],
  [/scheduleTime/i, () => 'Elige una fecha y hora válidas.'],
  [/quantity\s+must\s+be/i, () => 'La cantidad no es válida.'],
  [/is\s+required|should\s+not\s+be\s+empty/i, () => 'Este dato es obligatorio.'],
  [/must\s+be\s+one\s+of\s+the\s+following\s+values/i, () => 'Elige una opción válida.'],
  [/must\s+be\s+longer\s+than\s+or\s+equal\s+to\s+(\d+)\s+characters/i, (m) => `Debe tener al menos ${m[1]} caracteres.`],
];

function esTecnico(mensaje: string): boolean {
  return /must\s+be|should\s+be|is\s+required|characters|property|invalid\s+input/i.test(mensaje);
}

export function traducirMensaje(mensaje: string): string {
  for (const [patron, traducir] of TRADUCCIONES) {
    const coincidencia = mensaje.match(patron);
    if (coincidencia) return traducir(coincidencia);
  }
  if (esTecnico(mensaje)) return 'Revisa los datos e inténtalo de nuevo.';
  return mensaje;
}

// Mensajes para conflictos de negocio (HTTP 409).
const CONFLICTOS: Record<string, string> = {
  InsufficientStockError: 'No hay suficientes ingredientes para preparar tu pedido. Reduce la cantidad o modifica tu selección.',
  InactiveProductError: 'Un producto de tu carrito ya no está disponible. Actualiza tu selección.',
  NonExistentProductError: 'Un producto ya no existe en el catálogo. Actualiza tu carrito.',
  DisabledOptionError: 'Una opción seleccionada ya no está disponible. Elige otra opción.',
  FlavorNotAllowedError: 'El sabor seleccionado no está disponible para esta bebida.',
  MilkNotAllowedError: 'Esta bebida no admite leche. Modifica tu selección.',
  InsufficientPointsError: 'No tienes suficientes puntos para este canje. Puedes continuar sin utilizarlos.',
  NoActiveLoyaltyProgramError: 'El programa de recompensas no está disponible actualmente.',
  DuplicatePhoneError: 'Este teléfono ya está registrado.',
  MultipleFreeDrinksError: 'Solo puedes canjear una bebida gratis por pedido.',
  InvalidOrderStatusError: 'El estado actual del pedido no permite esta operación.',
  InvalidStatusTransitionError: 'No se puede realizar este cambio en el estado del pedido.',
  OrderAlreadyFinalError: 'El pedido ya fue entregado o cancelado y no puede modificarse.',
  PaymentNotApprovedError: 'El pago todavía no ha sido aprobado.',
  PaymentAlreadyProcessedError: 'Este pago ya fue aprobado. Consulta el estado de tu pedido.',
  InvalidPaymentStatusError: 'El estado actual del pago no permite esta operación.',
};

function mensajeDeConflicto(e: unknown): string {
  const datos = comoErrorApi(e)?.response?.data as
    { error?: unknown } | undefined;

  const tipo = datos?.error;

  if (
    typeof tipo === 'string' &&
    Object.prototype.hasOwnProperty.call(CONFLICTOS, tipo)
  ) {
    return CONFLICTOS[tipo];
  }

  const mensaje = mensajesDelServicio(e).join(' ');

  if (/correo.*registrado/i.test(mensaje)) {
    return 'Este correo ya está registrado.';
  }

  if (/tel[eé]fono.*registrado/i.test(mensaje)) {
    return CONFLICTOS.DuplicatePhoneError;
  }

  return 'No se pudo completar la operación debido a un conflicto. Revisa tu selección o consulta el estado actual antes de continuar.';
}

/** Mensaje para un aviso general. Nunca devuelve texto técnico. */
export function mensajeDeError(e: unknown, generico: string): string {
  const error = comoErrorApi(e);
  if (error?.response?.status === 401 && error.config?.url !== '/auth/login') {
    return 'Tu sesión terminó. Vuelve a entrar.';
  }
  if (error?.response?.status === 409) {
    return mensajeDeConflicto(e);
  }

  const mensajes = mensajesDelServicio(e).map(traducirMensaje);
  if (mensajes.length === 0) return generico;
  return [...new Set(mensajes)].join('. ');
}

export type ErroresCampo = Record<string, string | undefined>;

// El servicio usa nombres del DTO y, a veces, texto en español. Ambos se
// reconocen para poder colocar el mensaje junto al campo correcto.
const ALIAS: Record<string, string[]> = {
  correo: ['correo', 'email'],
  password: ['password', 'contrasena', 'contraseña'],
  firstName: ['firstname', 'nombre'],
  lastName: ['lastname', 'apellido'],
  phoneNumber: ['phonenumber', 'telefono', 'teléfono'],
  scheduleTime: ['scheduletime', 'fecha'],
  note: ['note', 'nota'],
};

/**
 * Coloca cada error de validación junto al campo que lo provocó.
 * `campos` son los nombres usados en el formulario.
 */
export function erroresDelServicio(e: unknown, campos: string[]): ErroresCampo {
  const resultado: ErroresCampo = {};
  for (const mensaje of mensajesDelServicio(e)) {
    const texto = mensaje.toLowerCase();
    const nombre = campos.find((clave) =>
      [clave, ...(ALIAS[clave] ?? [])].some((alias) =>
        texto.startsWith(alias.toLowerCase()) || texto.includes(`${alias.toLowerCase()} `),
      ),
    );
    if (nombre) resultado[nombre] = traducirMensaje(mensaje);
  }
  return resultado;
}
