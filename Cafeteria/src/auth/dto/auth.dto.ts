// NUEVO (Paso 2): lo que entra por /auth/registro y /auth/login.
// Sin @ApiProperty: el plugin de Swagger (nest-cli.json) lee los archivos
// .dto.ts y los documenta solo, incluidas estas reglas.
import { IsEmail, IsEnum, IsInt, IsOptional, MinLength } from 'class-validator';
import { Rol } from '../dominio/usuario';

export class RegistroDto {
  @IsEmail({}, { message: 'el correo no tiene un formato valido' })
  correo!: string;

  // El minimo va aqui, en la frontera. En el Service ya seria tarde.
  @MinLength(8, { message: 'la contrasena debe tener al menos 8 caracteres' })
  password!: string;

  @IsOptional() // si no lo mandan, el Service pone "miembro"
  @IsEnum(Rol, { message: 'rol debe ser miembro, entrenador o admin' })
  rol?: Rol;

  @IsOptional()
  @IsInt()
  idClient?: number;
}

export class LoginDto {
  @IsEmail({}, { message: 'el correo no tiene un formato valido' })
  correo!: string;

  @MinLength(1, { message: 'la contrasena es obligatoria' })
  password!: string;
}

// Lo que regresa el login. Es de salida: no lleva validaciones.
export class TokenDto {
  access_token!: string; // el JWT
  token_type!: string;   // siempre "Bearer"
  expires_in!: number;   // segundos de vigencia
}
