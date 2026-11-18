import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CLIENT_REPOSITORY } from './clients.tokens';
import type { ClientRepository } from './dominio/client.repository';
import { Client, DatosActualizacionClient } from './dominio/entidades';
import { DuplicatePhoneError, NonClientFoundError } from '../ordenes/dominio/errores';
import type { ActualizarClienteDto } from './dto/actualizar-cliente.dto';

@Injectable()
export class ClientsService {
    constructor(
        @Inject(CLIENT_REPOSITORY)
        private readonly repo: ClientRepository,
    ) {}

    findById(id: number): Promise<Client | null> {
        return this.repo.findById(id);
    }

    findAll(): Promise<Client[]> {
        return this.repo.findAll();
    }

    // El perfil se consulta con el idClient del JWT (RN-46): un cliente nunca
    // puede pedir los datos de otro aunque conozca su id.
    async findMio(idClient: number | null): Promise<Client> {
        if (idClient === null) {
            throw new ForbiddenException('Tu cuenta no tiene un cliente vinculado.');
        }
        const cliente = await this.repo.findById(idClient);
        if (!cliente) {
            throw new NonClientFoundError();
        }
        return cliente;
    }

    async actualizar(idClient: number | null, datos: ActualizarClienteDto): Promise<Client> {
        const cliente = await this.findMio(idClient);

        const cambios: DatosActualizacionClient = {};
        if (datos.firstName !== undefined) cambios.firstName = datos.firstName.trim();
        if (datos.lastName !== undefined) cambios.lastName = datos.lastName.trim();
        if (datos.phoneNumber !== undefined) cambios.phoneNumber = datos.phoneNumber.trim();

        // RN-51: el teléfono es único. Se permite conservar el propio, pero no
        // tomar el de otra cuenta; el índice UNIQUE es la red de seguridad.
        if (cambios.phoneNumber && cambios.phoneNumber !== cliente.phoneNumber) {
            const otro = await this.repo.findByPhone(cambios.phoneNumber);
            if (otro && otro.id !== cliente.id) {
                throw new DuplicatePhoneError();
            }
        }

        if (Object.keys(cambios).length === 0) {
            return cliente;
        }

        const actualizado = await this.repo.update(cliente.id, cambios);
        if (!actualizado) {
            throw new NonClientFoundError();
        }
        return actualizado;
    }
}
