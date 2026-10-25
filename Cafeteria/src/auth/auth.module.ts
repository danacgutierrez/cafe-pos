// NUEVO (Paso 3): junta todas las piezas de autenticacion.
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { USUARIO_REPOSITORY } from './dominio/usuario.repository';
import { UsuarioPrismaRepository } from './infra/usuario-prisma.repository';

@Module({
  imports: [
    PassportModule,
    // Configura el JwtService que usa AuthService para firmar.
    JwtModule.register({
      secret: process.env.JWT_SECRET,  // la llave: quien la tenga firma tokens validos
      signOptions: { expiresIn: '1h' }, // corto a proposito: un token robado caduca pronto
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy, // si falta aqui: Unknown authentication strategy "jwt"
    // Paso 7: la UNICA linea que cambio. Antes: UsuarioMemoriaRepository.
    // El AuthService no se entero.
    { provide: USUARIO_REPOSITORY, useClass: UsuarioPrismaRepository },
  ],
})
export class AuthModule {}
