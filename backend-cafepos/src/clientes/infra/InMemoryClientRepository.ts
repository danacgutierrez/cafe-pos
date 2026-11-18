import { ClientRepository } from '../dominio/client.repository';
import { Client, DatosActualizacionClient } from '../dominio/entidades';

export class InMemoryClientRepository implements ClientRepository {
    private clients: Client[] = [
        { id: 1, firstName: 'Karla', lastName: 'Duarte', loyaltyBalance: 0, phoneNumber: '1' },
        { id: 2, firstName: 'Sofia', lastName: 'Ibarra', loyaltyBalance: 0, phoneNumber: '2' },
    ];

    async findById(id: number): Promise<Client | null> {
        return this.clients.find(client => client.id === id) || null;
    }

    async findByPhone(phoneNumber: string): Promise<Client | null> {
        return this.clients.find(client => client.phoneNumber === phoneNumber) || null;
    }

    async findAll(): Promise<Client[]> {
        return [...this.clients];
    }

    async update(id: number, datos: DatosActualizacionClient): Promise<Client | null> {
        const cliente = await this.findById(id);
        if (!cliente) {
            return null;
        }
        Object.assign(cliente, datos);
        return { ...cliente };
    }
}
