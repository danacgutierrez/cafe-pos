import {
  UnauthorizedException,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtStrategy } from '../auth/jwt.strategy';
import { Rol } from '../auth/dominio/usuario';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

process.env.JWT_SECRET = 'secreto-de-prueba';

describe('OrdersController (autenticación)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let controller: OrdersController;
  const service = { createOrder: jest.fn() };

  const cuerpo = {
    idClient: 1,
    deliveryMode: 'PICKUP',
    fulfillmentType: 'IMMEDIATE',
    details: [{ idProduct: 1, quantity: 1 }],
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: process.env.JWT_SECRET }),
      ],
      controllers: [OrdersController],
      providers: [
        JwtStrategy,
        { provide: OrdersService, useValue: service },
      ],
    }).compile();

    app = modulo.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    jwt = modulo.get(JwtService);
    controller = modulo.get(OrdersController);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    service.createOrder.mockReset();
  });

  function tokenPara(idClient: number) {
    return jwt.sign({
      sub: 1,
      correo: 'cliente@itson.mx',
      rol: Rol.client,
      idClient,
    });
  }

  it('rechaza con 401 una orden sin token', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send(cuerpo)
      .expect(401);

    expect(service.createOrder).not.toHaveBeenCalled();
  });

  it('lanza 401 si el controlador se usa sin usuario', async () => {
    await expect(
      controller.create(cuerpo as never, undefined as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(service.createOrder).not.toHaveBeenCalled();
  });

  it('rechaza con 403 una orden para otro cliente', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${tokenPara(2)}`)
      .send(cuerpo)
      .expect(403);

    expect(service.createOrder).not.toHaveBeenCalled();
  });
});
