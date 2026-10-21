// NUEVO (Paso 2): un decorador propio. No es magia: SetMetadata guarda un
// dato pegado al metodo, y el JwtAuthGuard lo lee con el Reflector.
import { SetMetadata } from '@nestjs/common';

export const ES_PUBLICO = 'esPublico'; // la llave del dato

// Uso: @Publico() encima de un metodo o de un controller.
export const Publico = () => SetMetadata(ES_PUBLICO, true);
