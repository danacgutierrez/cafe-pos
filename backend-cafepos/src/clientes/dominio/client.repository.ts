import { Client, DatosActualizacionClient } from "./entidades";

export interface ClientRepository {
    findById(id: number): Promise<Client | null>
    findByPhone(phoneNumber: string): Promise<Client | null>;
    findAll(): Promise<Client[]>;
    update(id: number, datos: DatosActualizacionClient): Promise<Client | null>;
}
