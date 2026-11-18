// Contrato del repositorio de usuarios.
import type { NuevoClient } from '../../clientes/dominio/entidades';
import { NuevoUsuario, Usuario } from './usuario';

// Lo que el AuthService necesita. No sabe si es memoria o MySQL.
export interface UsuarioRepository {
  buscarPorCorreo(correo: string): Promise<Usuario | null>;
  guardar(nuevo: NuevoUsuario): Promise<Usuario>;
  // Alta de cliente + usuario en una sola transacción: así el JWT siempre
  // nace con un idClient válido y no quedan clientes huérfanos (RN-51).
  guardarConCliente(nuevo: NuevoUsuario, cliente: NuevoClient): Promise<Usuario>;
}

// La interfaz se borra al compilar, por eso se inyecta con este texto.
export const USUARIO_REPOSITORY = 'USUARIO_REPOSITORY';
