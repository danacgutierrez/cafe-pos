import { Client } from "./entidades";

export interface ClientRepository {
    findById(id: number): Promise<Client | null> 
    findAll(): Promise<Client[]>;
}