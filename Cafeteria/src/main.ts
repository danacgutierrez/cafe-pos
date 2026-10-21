// Primera linea: carga el .env (DATABASE_URL y ahora tambien JWT_SECRET).
import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';   // NUEVO: Reflector
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // NUEVO (Paso 6)
import { AppModule } from './app.module';
import { DominioExceptionFilter } from './comun/filtros/dominio.filter';
import { LoggingInterceptor } from './comun/interceptores/logging.interceptor';
import { SobreInterceptor } from './comun/interceptores/sobre.interceptor';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'; // NUEVO (Paso 4)
import { RolesGuard } from './auth/guards/roles.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // De la 9B: CORS, validacion, filtro e interceptores.
  app.enableCors({
    origin: ['http://localhost:5173'],
    exposedHeaders: ['Location', 'X-Request-Id'],
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new DominioExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new SobreInterceptor());

  // NUEVO (Paso 4): el guardia para TODAS las rutas.
  const reflector = app.get(Reflector);             // el guard lo usa para leer @Publico()
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector)); // tarea: + new RolesGuard(reflector)

  // NUEVO (Paso 6): la documentacion OpenAPI.
  const config = new DocumentBuilder()
    .setTitle('API del Gimnasio')          // titulo que sale arriba de /docs
    .setVersion('1.0')
    .addBearerAuth()                       // agrega el boton Authorize
    .addSecurityRequirements('bearer')     // pone el candado en todas las rutas
    .build();
  const documento = SwaggerModule.createDocument(app, config); // recorre controllers y DTO
  SwaggerModule.setup('docs', app, documento);                 // lo publica en /docs

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();