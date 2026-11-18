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

// Campos que la persona puede cambiar desde su perfil. El saldo, el id y el
// correo no se editan aquí: el correo vive en Usuario y forma parte del JWT.
export type DatosActualizacionClient = Partial<Pick<Client, 'firstName' | 'lastName' | 'phoneNumber'>>;