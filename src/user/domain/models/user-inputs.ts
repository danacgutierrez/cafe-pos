export interface AccountInput {
    username: string;
    email: string;
    password: string;
}

export interface RegisterClientInput extends AccountInput {
    firstName: string;
    lastName: string;
    phoneNumber: string;
}

export interface CreateStaffInput extends AccountInput {
    locationId: string;
}