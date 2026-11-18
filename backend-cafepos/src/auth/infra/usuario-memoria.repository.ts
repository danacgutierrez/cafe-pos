// Usuarios en memoria, para arrancar sin migracion.
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { Client, NuevoClient } from '../../clientes/dominio/entidades';
import { NuevoUsuario, Rol, Usuario } from '../dominio/usuario';
import { UsuarioRepository } from '../dominio/usuario.repository';

// Las mismas tres cuentas del seed, para que el front funcione igual
// contra esta API.
const CUENTAS: NuevoUsuario[] = [
  { correo: 'karla@itson.mx', passwordHash: '', rol: Rol.client, idClient: 1 },
  { correo: 'ana@itson.mx', passwordHash: '', rol: Rol.client, idClient: null },
  { correo: 'admin@itson.mx', passwordHash: '', rol: Rol.admin, idClient: null },
];

@Injectable()
export class UsuarioMemoriaRepository implements UsuarioRepository {
  private readonly datos = new Map<number, Usuario>(); // id -> usuario
  private readonly nuevosClientes = new Map<number, Client>();
  private siguienteId = 1;

  constructor() {
    // Las tres usan "cafeteria2026". Se guarda el HASH, nunca el texto.
    const hash = bcrypt.hashSync('cafeteria2026', 10);
    for (const c of CUENTAS) {
      void this.guardar({ ...c, passwordHash: hash });
    }
  }

  async buscarPorCorreo(correo: string): Promise<Usuario | null> {
    const buscado = correo.toLowerCase(); // Karla@ITSON.mx es el mismo correo
    return [...this.datos.values()].find((u) => u.correo === buscado) ?? null;
  }

  async guardar(nuevo: NuevoUsuario): Promise<Usuario> {
    const usuario: Usuario = {
      ...nuevo,
      correo: nuevo.correo.toLowerCase(),
      id: this.siguienteId++,  // el id lo pone el repositorio, como haria MySQL
      creadoEn: new Date(),
    };
    this.datos.set(usuario.id, usuario);
    return usuario;
  }

  async guardarConCliente(nuevo: NuevoUsuario, cliente: NuevoClient): Promise<Usuario> {
    // No hay base que revierta: se crea el cliente con el siguiente id libre
    // y se liga al usuario antes de guardarlo.
    const idCliente = Math.max(0, ...this.clientesIds()) + 1;
    this.nuevosClientes.set(idCliente, {
      id: idCliente,
      ...cliente,
      loyaltyBalance: 0,
    });
    return this.guardar({ ...nuevo, idClient: idCliente });
  }

  private clientesIds(): number[] {
    return [...this.nuevosClientes.keys()];
  }
}
