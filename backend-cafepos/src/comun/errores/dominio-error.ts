// Clase base comun a todos los errores de dominio.
// Los modulos pueden declarar el codigo HTTP que les corresponde con
// `super(mensaje, codigo)`; el filtro global lo respeta. Los errores que
// no lo declaran se mapean en `dominio.filter.ts`.
export class DomainError extends Error {
    readonly statusCode?: number;

    constructor(message: string, statusCode?: number) {
        super(message);
        this.name = 'DomainError';
        this.statusCode = statusCode;
    }
}
