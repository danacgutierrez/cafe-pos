import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Publico } from './auth/decoradores/publico.decorator'; // NUEVO (Paso 4)

@Publico() // NUEVO (Paso 4): la raiz es publica, sin token
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {} // Nest arma AppService y lo entrega ya listo aquí

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
