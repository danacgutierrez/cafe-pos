import { ForbiddenException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { DuplicatePhoneError, NonClientFoundError } from '../ordenes/dominio/errores';

describe('ClientsService (perfil)', () => {
  const propio = { id: 1, firstName: 'Karla', lastName: 'Duarte', phoneNumber: '1', loyaltyBalance: 0 };

  function build() {
    const repo = {
      findById: jest.fn().mockResolvedValue({ ...propio }),
      findByPhone: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation(async (_id, datos) => ({ ...propio, ...datos })),
    };
    return { service: new ClientsService(repo as any), repo };
  }

  it('devuelve solo el cliente del JWT', async () => {
    const { service } = build();
    await expect(service.findMio(1)).resolves.toMatchObject({ id: 1, firstName: 'Karla' });
  });

  it('actualiza nombre, apellido y teléfono propios', async () => {
    const { service, repo } = build();

    const resultado = await service.actualizar(1, {
      firstName: '  Karla  ',
      lastName: 'Pérez',
      phoneNumber: '5551234567',
    });

    expect(repo.update).toHaveBeenCalledWith(1, {
      firstName: 'Karla',
      lastName: 'Pérez',
      phoneNumber: '5551234567',
    });
    expect(resultado.firstName).toBe('Karla');
  });

  it('permite conservar el teléfono actual sin consultar duplicados', async () => {
    const { service, repo } = build();
    await service.actualizar(1, { phoneNumber: '1', firstName: 'Karla' });
    expect(repo.findByPhone).not.toHaveBeenCalled();
  });

  it('rechaza un teléfono que pertenece a otra cuenta (RN-51)', async () => {
    const { service, repo } = build();
    repo.findByPhone.mockResolvedValue({ id: 2, phoneNumber: '2' });

    await expect(service.actualizar(1, { phoneNumber: '2' })).rejects.toBeInstanceOf(
      DuplicatePhoneError,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('no permite editar si la cuenta no tiene cliente vinculado', async () => {
    const { service } = build();
    await expect(service.actualizar(null, { firstName: 'Karla' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('avisa si el cliente del JWT ya no existe', async () => {
    const { service, repo } = build();
    repo.findById.mockResolvedValue(null);
    await expect(service.actualizar(1, { firstName: 'Karla' })).rejects.toBeInstanceOf(
      NonClientFoundError,
    );
  });
});
