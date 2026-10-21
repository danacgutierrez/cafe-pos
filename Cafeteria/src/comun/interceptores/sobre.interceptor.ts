// De la Practica 9B (Paso 4.1): envuelve toda respuesta exitosa en { data, meta }.
// Rompe el contrato (res[0] pasa a ser res.data[0]): por eso se decide
// ahora, antes de que el React de la Unidad III empiece a consumirla.
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';   // map = "transforma el valor" (tap solo mira)

// La forma de toda respuesta exitosa. <T> es el tipo de lo que va en data.
export interface Sobre<T> {
  data: T;
  meta: {
    ruta: string;
    duracionMs: number;
    timestamp: string;
  };
}

@Injectable()
export class SobreInterceptor implements NestInterceptor {
  intercept(contexto: ExecutionContext, siguiente: CallHandler): Observable<Sobre<unknown>> {
    // ANTES: la ruta y la hora de inicio.
    const req = contexto.switchToHttp().getRequest<{ url: string }>();
    const inicio = Date.now();

    return siguiente.handle().pipe(
      // DESPUES: "data" es lo que regreso el controller. Lo metemos en el
      // sobre. Los errores no pasan por aqui: van directo al filtro.
      map((data) => ({
        data,
        meta: {
          ruta: req.url,
          duracionMs: Date.now() - inicio,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
