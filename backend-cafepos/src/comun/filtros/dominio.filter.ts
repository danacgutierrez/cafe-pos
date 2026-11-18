// Traduce TODOS los errores a una sola forma de respuesta HTTP.
import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../errores/dominio-error';
import {
    DuplicatePhoneError,
    EmptyOrderError,
    InactiveProductError,
    InsufficientPointsError,
    InvalidOrderStatusError,
    InvalidPointsToEarn,
    NoActiveLoyaltyProgramError,
    NonClientFoundError,
    NonExistentProductError,
    NonOrderFoundError,
} from '../../ordenes/dominio/errores';

interface CuerpoError {
    statusCode: number;
    error: string;
    message: string;
    path: string;
    timestamp: string;
}

const NOMBRES_ESTADO: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'Bad Request',
    [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
    [HttpStatus.FORBIDDEN]: 'Forbidden',
    [HttpStatus.NOT_FOUND]: 'Not Found',
    [HttpStatus.CONFLICT]: 'Conflict',
    [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
    [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};

@Catch()
export class DominioExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger('Dominio');

    private codigoPara(error: DomainError): number {
        // Entrada mal formada o regla de negocio sobre el estado -> 400/409.
        if (error instanceof EmptyOrderError) {
            return HttpStatus.BAD_REQUEST;
        }

        if (
            error instanceof InactiveProductError ||
            error instanceof NonExistentProductError ||
            error instanceof InvalidOrderStatusError ||
            error instanceof InvalidPointsToEarn ||
            error instanceof NoActiveLoyaltyProgramError ||
            error instanceof InsufficientPointsError ||
            error instanceof DuplicatePhoneError
        ) {
            return HttpStatus.CONFLICT;
        }

        // Lo que no existe -> 404.
        if (error instanceof NonClientFoundError || error instanceof NonOrderFoundError) {
            return HttpStatus.NOT_FOUND;
        }

        // Un error de dominio que olvidamos mapear -> 500, para que se note.
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    // Prisma P2002 = violacion de UNIQUE. RN-51 se chequea con el indice
    // unico de clients.phoneNumber, asi que aqui se traduce a 409.
    private conflictoDePrisma(error: unknown): { error: string; message: string } | null {
        const prisma = error as { code?: unknown; meta?: { target?: unknown } };

        if (prisma?.code !== 'P2002') {
            return null;
        }

        const objetivo = Array.isArray(prisma.meta?.target)
            ? prisma.meta.target.join(', ')
            : String(prisma.meta?.target ?? '');

        if (objetivo.includes('phoneNumber')) {
            return {
                error: DuplicatePhoneError.name,
                message: new DuplicatePhoneError().message,
            };
        }

        return { error: NOMBRES_ESTADO[HttpStatus.CONFLICT], message: 'El valor ya está registrado.' };
    }

    private mensajeDeHttp(error: HttpException): string {
        const respuesta = error.getResponse();

        if (typeof respuesta === 'string') {
            return respuesta;
        }

        if (respuesta && typeof respuesta === 'object') {
            const mensaje = (respuesta as { message?: string | string[] }).message;

            if (Array.isArray(mensaje)) {
                return mensaje.join('; ');
            }

            if (typeof mensaje === 'string') {
                return mensaje;
            }
        }

        return error.message;
    }

    private cuerpoPara(error: unknown, req: { url: string }): CuerpoError {
        const base = { path: req.url, timestamp: new Date().toISOString() };

        if (error instanceof DomainError) {
            const statusCode = error.statusCode ?? this.codigoPara(error);
            return {
                ...base,
                statusCode,
                error: error.constructor.name,
                message: error.message,
            };
        }

        const conflicto = this.conflictoDePrisma(error);
        if (conflicto) {
            return { ...base, statusCode: HttpStatus.CONFLICT, ...conflicto };
        }

        if (error instanceof HttpException) {
            const statusCode = error.getStatus();
            return {
                ...base,
                statusCode,
                error: NOMBRES_ESTADO[statusCode] ?? 'Error',
                message: this.mensajeDeHttp(error),
            };
        }

        return {
            ...base,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: NOMBRES_ESTADO[HttpStatus.INTERNAL_SERVER_ERROR],
            message: 'Error interno del servidor.',
        };
    }

    catch(error: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();
        const req = ctx.getRequest<{ url: string; method: string }>();
        const cuerpo = this.cuerpoPara(error, req);

        const traza = `${req.method} ${req.url} -> ${cuerpo.statusCode} ${cuerpo.error}: ${cuerpo.message}`;
        if (cuerpo.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(traza);
        } else {
            this.logger.warn(traza);
        }

        res.status(cuerpo.statusCode).json(cuerpo);
    }
}
