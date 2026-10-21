// NUEVO (Paso 1): el usuario que inicia sesion.

// Los roles posibles. Es enum (y no union de textos) porque existe en
// tiempo de ejecucion: @IsEnum(Rol) del DTO lo necesita para comparar.
export enum Rol {
  client = 'entrenador',
  admin = 'admin',
}

export interface Usuario {
  id: number;
  correo: string;
  // Se llama passwordHash y no password: con ese nombre es imposible
  // guardar la contrasena en claro por descuido.
  passwordHash: string;
  rol: Rol;
  idClient: number | null; // el miembro del gimnasio que es; null si es personal
  creadoEn: Date;
}

// Lo que se manda a guardar: todo menos lo que pone el repositorio.
export type NuevoUsuario = Omit<Usuario, 'id' | 'creadoEn'>;

// Lo que viaja DENTRO del token. NO va cifrado: cualquiera lo lee en
// jwt.io, asi que aqui no va nada secreto (ni el hash).
export interface PayloadJwt {
  sub: number;              // "subject": el id del usuario (nombre estandar, RFC 7519)
  correo: string;
  rol: Rol;
  idClient: number | null;
}
