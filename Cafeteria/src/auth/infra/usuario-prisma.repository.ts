// NUEVO (Paso 7): el mismo contrato que el de memoria, pero contra MySQL.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NuevoUsuario, Rol, Usuario } from '../dominio/usuario';
import { UsuarioRepository } from '../dominio/usuario.repository';

@Injectable()
export class UsuarioPrismaRepository implements UsuarioRepository {
  constructor(private readonly prisma: PrismaService) {} // PrismaModule es @Global()

  async buscarPorCorreo(correo: string): Promise<Usuario | null> {
    const fila = await this.prisma.usuario.findUnique({
      // findUnique porque correo es @unique en el esquema
      where: { correo: correo.toLowerCase() },
    });
    // En la base rol es texto; en el dominio es el enum Rol.
    return fila ? { ...fila, rol: fila.rol as Rol } : null;
  }

  async guardar(nuevo: NuevoUsuario): Promise<Usuario> {
    // id y creadoEn no se mandan: los pone MySQL.
    const fila = await this.prisma.usuario.create({
      data: { ...nuevo, correo: nuevo.correo.toLowerCase() },
    });
    return { ...fila, rol: fila.rol as Rol };
  }
}
