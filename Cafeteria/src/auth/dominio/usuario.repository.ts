// NUEVO (Paso 1): el mismo molde de siempre, interfaz + token.
import { NuevoUsuario, Usuario } from './usuario';

// Lo que el AuthService necesita. No sabe si es memoria o MySQL.
export interface UsuarioRepository {
  buscarPorCorreo(correo: string): Promise<Usuario | null>;
  guardar(nuevo: NuevoUsuario): Promise<Usuario>;
}

// La interfaz se borra al compilar, por eso se inyecta con este texto.
export const USUARIO_REPOSITORY = 'USUARIO_REPOSITORY';
