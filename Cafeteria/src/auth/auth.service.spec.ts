import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Rol } from './dominio/usuario';

describe('AuthService.registrar', () => {
  function build() {
    const usuarios = {
      buscarPorCorreo: jest.fn().mockResolvedValue(null),
      guardar: jest.fn().mockResolvedValue({
        id: 10,
        correo: 'nuevo@itson.mx',
        passwordHash: 'hash',
        rol: Rol.client,
        idClient: 7,
        creadoEn: new Date(),
      }),
      guardarConCliente: jest.fn().mockResolvedValue({
        id: 11,
        correo: 'nuevo@itson.mx',
        passwordHash: 'hash',
        rol: Rol.client,
        idClient: 8,
        creadoEn: new Date(),
      }),
    };
    const clientes = { findByPhone: jest.fn().mockResolvedValue(null) };
    const jwt = { signAsync: jest.fn().mockResolvedValue('token') };

    return {
      service: new AuthService(usuarios as any, clientes as any, jwt as any),
      usuarios,
      clientes,
      jwt,
    };
  }

  it('crea el Client junto al usuario cuando no viene idClient', async () => {
    const { service, usuarios } = build();

    const token = await service.registrar({
      correo: 'nuevo@itson.mx',
      password: 'cafeteria2026',
      firstName: 'Nuevo',
      lastName: 'Cliente',
      phoneNumber: '5551234567',
    });

    expect(usuarios.guardarConCliente).toHaveBeenCalledTimes(1);
    expect(usuarios.guardar).not.toHaveBeenCalled();
    expect(usuarios.guardarConCliente.mock.calls[0][1]).toMatchObject({
      firstName: 'Nuevo',
      lastName: 'Cliente',
      phoneNumber: '5551234567',
    });
    expect(token).toEqual({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 });
  });

  it('genera un teléfono temporal si no se proporciona', async () => {
    const { service, usuarios } = build();

    await service.registrar({ correo: 'nuevo@itson.mx', password: 'cafeteria2026' });

    const cliente = usuarios.guardarConCliente.mock.calls[0][1];
    expect(cliente.phoneNumber).toMatch(/^TMP-[0-9a-z]+-[0-9a-f]{6}$/);
    expect(cliente.phoneNumber.length).toBeLessThanOrEqual(20);
  });

  it('vincula un Client existente si viene idClient', async () => {
    const { service, usuarios } = build();

    await service.registrar({ correo: 'nuevo@itson.mx', password: 'cafeteria2026', idClient: 4 });

    expect(usuarios.guardar).toHaveBeenCalledTimes(1);
    expect(usuarios.guardar.mock.calls[0][0].idClient).toBe(4);
    expect(usuarios.guardarConCliente).not.toHaveBeenCalled();
  });

  it('rechaza un teléfono ya registrado', async () => {
    const { service, clientes, usuarios } = build();
    clientes.findByPhone.mockResolvedValue({ id: 1, phoneNumber: '5551234567' });

    await expect(
      service.registrar({
        correo: 'nuevo@itson.mx',
        password: 'cafeteria2026',
        phoneNumber: '5551234567',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(usuarios.guardarConCliente).not.toHaveBeenCalled();
  });
});
