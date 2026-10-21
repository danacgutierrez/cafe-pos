import { ClientRepository } from "../dominio/client.repository";
import { Client } from "../dominio/entidades";

export class InMemoryClientRepository implements ClientRepository {

    private products: Client[] = [
        { id: 1, firstName: 'Karla', lastName: 'Duarte', loyaltyBalance: 0, phoneNumber: '1'},
        { id: 2, firstName: 'Sofia', lastName: 'Ibarra', loyaltyBalance: 0, phoneNumber: '2'},
    ];

    async findById(id: number): Promise<Client | null> {
        return this.products.find(p => p.id === id) || null;
    }

    async findAll(): Promise<Client[]> {
        return [...this.products];
    }
}