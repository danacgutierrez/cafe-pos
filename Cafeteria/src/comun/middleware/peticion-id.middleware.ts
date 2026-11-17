// Un middleware corre antes de que Nest sepa qué controller atenderá la petición.
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';   // genera ids unicos, viene con Node

@Injectable()
export class PeticionIdMiddleware implements NestMiddleware {
  // Recibe tres cosas: la peticion, la respuesta, y next = "el siguiente
  // de la fila". Es la firma de Express, sin nada de Nest.
  use(req: Request, res: Response, next: NextFunction) {
    // Si el cliente ya mando un X-Request-Id lo respetamos; si no, uno nuevo.
    const id = (req.headers['x-request-id'] as string) ?? randomUUID();

    // Lo pegamos a la respuesta: sirve para seguir una peticion en los logs.
    res.setHeader('X-Request-Id', id);

    // Deja pasar la peticion. Sin esta linea se queda colgada para siempre
    // y NO sale ningun error.
    next();
  }
}
