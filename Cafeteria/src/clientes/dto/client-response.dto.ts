import { Client } from "../dominio/entidades";

export interface ClientResponseDto {
    id: number;
    firstName: string;
    lastName: string;
    loyaltyBalance: number;
    phoneNumber: string;
}

export function toClientDto(client: Client): ClientResponseDto {
    return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        loyaltyBalance: client.loyaltyBalance,
        phoneNumber: client.phoneNumber
    };
}