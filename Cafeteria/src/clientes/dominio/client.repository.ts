import { Client } from "./entidades";

export interface ClientRepository {
    findById(id: number): Promise<Client | null>
    findByPhone(phoneNumber: string): Promise<Client | null>;
    findAll(): Promise<Client[]>;
}