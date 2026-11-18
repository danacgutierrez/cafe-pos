export class Client {
    id!: number;
    firstName!: string;
    lastName!: string;
    loyaltyBalance!: number;
    phoneNumber!: string;
}

// Datos que el registro necesita para dar de alta un cliente nuevo.
// id y loyaltyBalance los pone la base (RN-51: teléfono único).
export type NuevoClient = Pick<Client, 'firstName' | 'lastName' | 'phoneNumber'>;