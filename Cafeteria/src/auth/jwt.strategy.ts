// NUEVO (Paso 3): la estrategia de Passport que lee y verifica el token.
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PayloadJwt } from './dominio/usuario';

// PassportStrategy(Strategy) registra la estrategia con el nombre "jwt".
// Ese nombre es el que usa AuthGuard('jwt') en el guard.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // De donde se saca el token: del encabezado Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // un token vencido se rechaza con 401
      // OJO: aqui se llama secretOrKey. En el JwtModule se llama secret.
      // Tiene que ser el MISMO valor, o ningun token va a pasar.
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  // Solo corre si la firma cuadra y no vencio. Lo que regresa queda en
  // req.user, y de ahi lo toma @UsuarioActual().
  validate(payload: PayloadJwt): PayloadJwt {
    return payload;
  }
}
