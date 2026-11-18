// Registro y login.
import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';     // firma los tokens (lo da JwtModule)
import * as bcrypt from 'bcryptjs';            // hash de contrasenas
import { CLIENT_REPOSITORY } from '../clientes/clients.tokens';
import type { ClientRepository } from '../clientes/dominio/client.repository';
import type { NuevoClient } from '../clientes/dominio/entidades';
import { PayloadJwt, Rol, Usuario } from './dominio/usuario';
import { USUARIO_REPOSITORY, type UsuarioRepository } from './dominio/usuario.repository';
import { LoginDto, RegistroDto, TokenDto } from './dto/auth.dto';

// 2^10 vueltas de bcrypt. Lento a proposito: es lo que hace caro probar
// un diccionario completo contra el hash.
const VUELTAS = 10;

@Injectable()
export class AuthService {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly repo: UsuarioRepository, // por el token
    @Inject(CLIENT_REPOSITORY) private readonly clientes: ClientRepository,
    private readonly jwt: JwtService,                                    // por la clase
  ) {}

  async registrar(dto: RegistroDto): Promise<TokenDto> {
    // En el registro SI se puede decir que el correo existe: la persona
    // necesita saberlo para iniciar sesion en su lugar.
    if (await this.repo.buscarPorCorreo(dto.correo)) {
      throw new ConflictException('Ese correo ya esta registrado'); // 409
    }

    const passwordHash = await bcrypt.hash(dto.password, VUELTAS);

    // Si no se vincula un Client existente, se crea uno nuevo en la misma
    // transacción que el usuario. Así el token siempre trae idClient y la
    // cuenta recién registrada ya puede ordenar y ver /orders/mine.
    const nuevoCliente: NuevoClient | null = dto.idClient
      ? null
      : {
          firstName: dto.firstName?.trim() || 'Cliente',
          lastName: dto.lastName?.trim() || 'Registrado',
          phoneNumber: dto.phoneNumber?.trim() || telefonoTemporal(),
        };

    if (nuevoCliente && (await this.clientes.findByPhone(nuevoCliente.phoneNumber))) {
      throw new ConflictException('Ese teléfono ya está registrado'); // RN-51
    }

    const usuario = nuevoCliente
      ? await this.repo.guardarConCliente(
          {
            correo: dto.correo,
            passwordHash,
            rol: Rol.client,
            idClient: null,
          },
          nuevoCliente,
        )
      : await this.repo.guardar({
          correo: dto.correo,
          passwordHash,
          rol: Rol.client,
          idClient: dto.idClient ?? null,
        });

    return this.firmar(usuario); // quien se registra ya queda con sesion
  }

  async login(dto: LoginDto): Promise<TokenDto> {
    const usuario = await this.repo.buscarPorCorreo(dto.correo);
    // El MISMO mensaje en los dos casos. Si fueran distintos, cualquiera
    // averigua que correos existen probando uno por uno.
    const generico = new UnauthorizedException('Credenciales invalidas'); // 401
    if (!usuario) throw generico;
    // compare() no "descifra": vuelve a calcular el hash y lo compara.
    if (!(await bcrypt.compare(dto.password, usuario.passwordHash))) throw generico;
    return this.firmar(usuario);
  }

  // Arma el payload y lo firma con JWT_SECRET.
  private async firmar(usuario: Usuario): Promise<TokenDto> {
    const payload: PayloadJwt = {
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      idClient: usuario.idClient,
    };
    return {
      access_token: await this.jwt.signAsync(payload), // header.payload.firma
      token_type: 'Bearer',
      expires_in: 3600, // 1 hora, igual que en auth.module.ts
    };
  }
}

// phoneNumber es VARCHAR(20) y único. Si el formulario no lo pide, se genera
// un valor temporal corto y prácticamente imposible de repetir (RN-51).
function telefonoTemporal(): string {
  return `TMP-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
}
