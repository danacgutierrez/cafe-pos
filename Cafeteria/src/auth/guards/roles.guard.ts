import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES } from '../decoradores/roles.decorator';
import { PayloadJwt, Rol } from '../dominio/usuario';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.getAllAndOverride<Rol[]>(ROLES, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    if (!rolesPermitidos) {
      return true;
    }

    const req = contexto.switchToHttp().getRequest<{ user: PayloadJwt }>();

    if (!rolesPermitidos.includes(req.user.rol)) {
      throw new ForbiddenException('No tienes permiso para realizar esta accion');
    }

    return true;
  }
}