// El usuario que inicia sesion.

// Los roles posibles. Coinciden con los valores guardados en la base.
export enum Rol {
  client = 'client',
  staff = 'staff',
  admin = 'admin',
}

export interface Usuario {
  id: number;
  correo: string;
  // Se llama passwordHash y no password: con ese nombre es imposible
  // guardar la contrasena en claro por descuido.
  passwordHash: string;
  rol: Rol;
  idClient: number | null; // cliente de la cafeteria al que pertenece; null si es personal
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
