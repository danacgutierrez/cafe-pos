// Login y registro contra el servicio. El token se obtiene de /auth/login o
// /auth/registro; los datos de la persona se leen de /auth/yo.
import { api } from '../../../compartido/api/api.ts';
import type { TokenRespuesta, PayloadJwt, Sesion } from '../../../compartido/api/tipos.ts';

function usuarioConToken(token: string): Promise<Sesion> {
  return api
    .get<PayloadJwt>('/auth/yo', {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((r) => ({ token, usuario: r.data }));
}

export async function entrar(correo: string, password: string): Promise<Sesion> {
  const r = await api.post<TokenRespuesta>('/auth/login', { correo, password });
  return usuarioConToken(r.data.access_token);
}

export interface DatosRegistro {
  correo: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

// Quien se registra ya queda con sesión (el token trae idClient).
export async function registrar(datos: DatosRegistro): Promise<Sesion> {
  const r = await api.post<TokenRespuesta>('/auth/registro', datos);
  return usuarioConToken(r.data.access_token);
}
