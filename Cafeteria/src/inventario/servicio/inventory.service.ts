import { Inject, Injectable } from '@nestjs/common';
import { DIAS_CONSUMO, DIAS_OBJETIVO, MovementType } from '../dominio/entidades';
import {
    EmptyMovementError,
    IngredientNotFoundError,
    InvalidAdjustmentValueError,
    InvalidMovementQuantityError,
    MissingMovementReasonError,
} from '../dominio/errores';
import { INVENTORY_REPOSITORY, type InventoryRepository } from '../dominio/inventory.repository';
import {
    AdjustStockDto,
    MoveStockDto,
    RegisterEntryDto,
    RegisterWasteDto,
    SetMinStockDto,
} from '../dto/inventory.dto';
import { toIngredientDto } from '../dto/inventory-response.dto';

@Injectable()
export class InventoryService {
    constructor(@Inject(INVENTORY_REPOSITORY) private readonly repo: InventoryRepository) {}

    async list() {
        const ingredientes = await this.repo.findAll();

        return await Promise.all(
            ingredientes.map(async (ingrediente) => {
                const consumo = await this.repo.averageDailyConsumption(ingrediente.id, DIAS_CONSUMO);
                return toIngredientDto(ingrediente, consumo, DIAS_OBJETIVO);
            }),
        );
    }

    listMovements(idIngredient?: number) {
        return this.repo.findMovements(idIngredient);
    }

    registerEntry(dto: RegisterEntryDto, responsible: string) {
        return this.repo.registerEntry(dto.idIngredient, dto.quantity, responsible);
    }

    consume(dto: MoveStockDto, responsible: string) {
        this.validarMovimientos(dto.movements.map((m) => m.quantity));
        return this.repo.consume({
            movements: dto.movements,
            reason: dto.reason,
            responsible,
        });
    }

    returnStock(dto: MoveStockDto, responsible: string) {
        this.validarMovimientos(dto.movements.map((m) => m.quantity));
        return this.repo.returnStock({
            movements: dto.movements,
            reason: dto.reason,
            responsible,
        });
    }

    // RN-32: el mínimo lo define la dueña; el alerta se calcula en list().
    async setMinStock(idIngredient: number, dto: SetMinStockDto) {
        const ingrediente = await this.repo.findById(idIngredient);

        if (!ingrediente) {
            throw new IngredientNotFoundError();
        }

        return this.repo.setMinStock(idIngredient, dto.minStock);
    }

    // RN-30: la merma sale del stock y queda registrada como movimiento.
    async registerWaste(dto: RegisterWasteDto, responsible: string) {
        this.validarMovimientos([dto.quantity]);
        this.validarMotivo(dto.reason);

        return this.repo.registerMovement({
            idIngredient: dto.idIngredient,
            movementType: MovementType.WASTE,
            quantity: -dto.quantity,
            reason: dto.reason,
            responsible,
        });
    }

    // RN-30/RN-50: un error se corrige con un movimiento nuevo, nunca
    // borrando ni editando el anterior.
    async adjustStock(dto: AdjustStockDto, responsible: string) {
        this.validarMotivo(dto.reason);

        if (!dto.quantity) {
            throw new InvalidAdjustmentValueError();
        }

        return this.repo.registerMovement({
            idIngredient: dto.idIngredient,
            movementType: MovementType.ADJUSTMENT,
            quantity: dto.quantity,
            reason: dto.reason,
            responsible,
        });
    }

    private validarMotivo(reason: string): void {
        if (!reason || !reason.trim()) {
            throw new MissingMovementReasonError();
        }
    }

    private validarMovimientos(cantidades: number[]): void {
        if (cantidades.length === 0) {
            throw new EmptyMovementError();
        }

        if (cantidades.some((cantidad) => cantidad <= 0)) {
            throw new InvalidMovementQuantityError();
        }
    }
}
