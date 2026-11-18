// Lo que entra por /auth/registro y /auth/login.
// Sin @ApiProperty: el plugin de Swagger (nest-cli.json) lee los archivos
// .dto.ts y los documenta solo, incluidas estas reglas.
import { IsEmail, IsInt, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class RegistroDto {
  @IsEmail({}, { message: 'el correo no tiene un formato valido' })
  correo!: string;

  // El minimo va aqui, en la frontera. En el Service ya seria tarde.
  @MinLength(8, { message: 'la contrasena debe tener al menos 8 caracteres' })
  password!: string;

  // Datos del Client que se crea junto al usuario. Si se omiten se usan
  // valores por defecto y un teléfono temporal único (RN-51).
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  phoneNumber?: string;

  // Solo para vincular una cuenta a un Client ya existente (flujo internos).
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
