// Decorador de parametro, como @Body o @Param, que entrega req.user ya tipado.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PayloadJwt } from '../dominio/usuario';

export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): PayloadJwt => {
    const req = contexto.switchToHttp().getRequest<{ user: PayloadJwt }>();
    return req.user; // lo dejo ahi el validate() de la JwtStrategy
  },
);
