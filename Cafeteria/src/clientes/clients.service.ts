import { Inject, Injectable } from '@nestjs/common';
import { CLIENT_REPOSITORY } from './clients.tokens';
import type { ClientRepository } from './dominio/client.repository';
import { Client } from './dominio/entidades';

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
}