// NUEVO (Paso 4): el guardia que se registra global en main.ts.
// Seguro por omision: TODO pide token, y lo publico se marca a mano con
// @Publico(). Si alguien olvida @Publico(), la ruta da 401 y se nota; al
// reves, olvidar proteger una ruta deja un hueco que nadie ve.
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';        // lee los metadatos de los decoradores
import { AuthGuard } from '@nestjs/passport';
import { ES_PUBLICO } from '../decoradores/publico.decorator';

// AuthGuard('jwt') ya sabe verificar el token con la JwtStrategy.
// Nosotros solo le agregamos la excepcion de @Publico().
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(contexto: ExecutionContext) {
    // Busca la marca de @Publico() en el metodo y luego en la clase.
    // Esto es lo que un middleware NO puede hacer: saber a que metodo va.
    const esPublico = this.reflector.getAllAndOverride<boolean>(ES_PUBLICO, [
      contexto.getHandler(), // el metodo: login(), listar()...
      contexto.getClass(),   // el controller completo
    ]);
    // Publica -> pasa. Si no -> que Passport verifique el token (401 si falla).
    return esPublico ? true : super.canActivate(contexto);
  }
}
