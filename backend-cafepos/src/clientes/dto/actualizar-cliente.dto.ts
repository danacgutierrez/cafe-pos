// Lo que entra por PATCH /clients/me. Todos los campos son opcionales para
// poder enviar solo lo que cambió; el global ValidationPipe eliminaría
// cualquier propiedad que no esté declarada aquí (whitelist/forbidNonWhitelisted).
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class ActualizarClienteDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Matches(/\S/, { message: 'el nombre no puede estar vacío' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Matches(/\S/, { message: 'el apellido no puede estar vacío' })
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  @Matches(/\S/, { message: 'el teléfono no puede estar vacío' })
  phoneNumber?: string;
}
