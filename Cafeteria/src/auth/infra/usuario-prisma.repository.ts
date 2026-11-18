// Repositorio de usuarios contra MySQL.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { NuevoClient } from '../../clientes/dominio/entidades';
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

  async guardarConCliente(nuevo: NuevoUsuario, cliente: NuevoClient): Promise<Usuario> {
    // Si algo falla, se revierten las dos inserciones. El usuario queda
    // ligado al cliente recién creado antes de firmar el token.
    const fila = await this.prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: { ...cliente, loyaltyBalance: 0 },
      });

      return tx.usuario.create({
        data: {
          ...nuevo,
          correo: nuevo.correo.toLowerCase(),
          idClient: client.id,
        },
      });
    });

    return { ...fila, rol: fila.rol as Rol };
  }
}
