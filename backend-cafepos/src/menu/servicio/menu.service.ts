import { Inject, Injectable } from '@nestjs/common';
import {
    BeverageNotFoundError,
    BeverageWithoutRecipeError,
    DisabledOptionError,
    DrinkTypeNotFoundError,
    EmptyRecipeError,
    FlavorNotFoundError,
    FlavorNotAllowedError,
    IngredientNotFoundError,
    InvalidSweetnessError,
    MenuOptionNotFoundError,
    MilkNotAllowedError,
} from '../dominio/errores';
import { Customization, OptionKind, Quote } from '../dominio/entidades';
import { MENU_REPOSITORY, type MenuRepository } from '../dominio/menu.repository';
import {
    CreateBeverageDto,
    CreateDrinkTypeDto,
    CreateFlavorDto,
    CreateOptionDto,
    QuoteDto,
    SaveRecipeDto,
    SetActiveDto,
    UpdatePriceDto,
} from '../dto/menu.dto';
import { toMenuResponse } from '../dto/menu-response.dto';

@Injectable()
export class MenuService {
    constructor(@Inject(MENU_REPOSITORY) private readonly repo: MenuRepository) {}

    async listCatalog() {
        const [drinkTypes, flavors, options, beverages] = await Promise.all([
            this.repo.findAllTypes(),
            this.repo.findFlavors(),
            this.repo.findAllOptions(),
            this.repo.findAllBeverages(),
        ]);
        // RN-02/RN-49: el catálogo público solo muestra lo activo.
        return toMenuResponse(
            drinkTypes.filter((tipo) => tipo.isActive),
            flavors.filter((sabor) => sabor.isActive),
            options.filter((opcion) => opcion.isActive),
            beverages.filter((bebida) => bebida.isActive),
        );
    }

    createDrinkType(dto: CreateDrinkTypeDto) {
        return this.repo.createDrinkType(dto.name);
    }

    createFlavor(dto: CreateFlavorDto) {
        return this.repo.createFlavor(dto.idDrinkType, dto.name);
    }

    createOption(dto: CreateOptionDto) {
        return this.repo.createOption(dto.kind, dto.name, dto.surcharge);
    }

    createBeverage(dto: CreateBeverageDto) {
        return this.repo.createBeverage({
            name: dto.name,
            idDrinkType: dto.idDrinkType,
            idFlavor: dto.idFlavor,
            basePrice: dto.basePrice,
            allowsMilk: dto.allowsMilk ?? true,
        });
    }

    // RN-04/RN-08: no hay borrado, solo baja lógica para conservar el historial.
    async setTypeActive(id: number, dto: SetActiveDto) {
        const tipo = await this.repo.findDrinkType(id);

        if (!tipo) {
            throw new DrinkTypeNotFoundError();
        }

        return this.repo.setTypeActive(id, dto.isActive);
    }

    async setFlavorActive(id: number, dto: SetActiveDto) {
        const sabor = await this.repo.findFlavor(id);

        if (!sabor) {
            throw new FlavorNotFoundError();
        }

        return this.repo.setFlavorActive(id, dto.isActive);
    }

    async setOptionActive(id: number, dto: SetActiveDto) {
        const opcion = await this.repo.findOption(id);

        if (!opcion) {
            throw new MenuOptionNotFoundError('opción');
        }

        return this.repo.setOptionActive(id, dto.isActive);
    }

    async setBeverageActive(id: number, dto: SetActiveDto) {
        const bebida = await this.repo.findBeverage(id);

        if (!bebida) {
            throw new BeverageNotFoundError();
        }

        if (dto.isActive && (!bebida.recipe || !bebida.recipe.hasItems)) {
            throw new BeverageWithoutRecipeError();
        }

        return this.repo.setBeverageActive(id, dto.isActive);
    }

    async updateBeveragePrice(id: number, dto: UpdatePriceDto) {
        const bebida = await this.repo.findBeverage(id);

        if (!bebida) {
            throw new BeverageNotFoundError();
        }

        // RN-08/RN-50: solo afecta pedidos futuros; el precio congelado
        // de los pedidos anteriores permanece intacto.
        return this.repo.updateBeveragePrice(id, dto.basePrice);
    }

    // RN-03/RN-26: la receta base describe los insumos fijos. La leche
    // siempre se descuenta aparte según lo que eligió el cliente.
    async saveRecipe(idBeverage: number, dto: SaveRecipeDto) {
        const bebida = await this.repo.findBeverage(idBeverage);

        if (!bebida) {
            throw new BeverageNotFoundError();
        }

        if (!dto.items || dto.items.length === 0) {
            throw new EmptyRecipeError();
        }

        for (const item of dto.items) {
            const ingrediente = await this.repo.findIngredient(item.idIngredient);

            if (!ingrediente) {
                throw new IngredientNotFoundError();
            }
        }

        return this.repo.saveRecipe(
            idBeverage,
            dto.items.map((item) => ({
                idIngredient: item.idIngredient,
                baseQuantity: item.baseQuantity,
            })),
        );
    }

    // RN-01, RN-02, RN-06 y RN-07: validar y cotizar siempre el sistema.
    async quote(dto: QuoteDto): Promise<Quote> {
        const bebida = await this.repo.findBeverage(dto.idBeverage);

        if (!bebida) {
            throw new BeverageNotFoundError();
        }

        if (!bebida.isActive) {
            throw new DisabledOptionError(bebida.name);
        }

        const sabor = await this.repo.findFlavor(bebida.idFlavor);
        const tipo = await this.repo.findDrinkType(bebida.idDrinkType);

        if (!sabor || !tipo || !tipo.isActive || sabor.idDrinkType !== bebida.idDrinkType || !sabor.isActive) {
            throw new FlavorNotAllowedError();
        }

        const personalizacion: Customization = dto.customization ?? {};
        let recargos = 0;
        const desglose: string[] = [];

        const validarOpcion = async (id: number | undefined, kind: OptionKind, etiqueta: string) => {
            if (id === undefined) {
                return null;
            }

            const opcion = await this.repo.findOption(id);

            if (!opcion || opcion.kind !== kind) {
                throw new MenuOptionNotFoundError(etiqueta);
            }

            if (!opcion.isActive) {
                throw new DisabledOptionError(opcion.name);
            }

            recargos += Number(opcion.surcharge);
            desglose.push(`${etiqueta}: ${opcion.name} (+${opcion.surcharge})`);
            return opcion;
        };

        const tamano = await validarOpcion(personalizacion.sizeId, OptionKind.SIZE, 'Tamaño');
        const leche = await validarOpcion(personalizacion.milkId, OptionKind.MILK, 'Leche');
        const endulzante = await validarOpcion(personalizacion.sweetenerId, OptionKind.SWEETENER, 'Endulzante');

        if (leche && !bebida.allowsMilk) {
            throw new MilkNotAllowedError();
        }

        if (personalizacion.sweetness !== undefined && !endulzante) {
            throw new InvalidSweetnessError();
        }

        for (const id of personalizacion.extraIds ?? []) {
            await validarOpcion(id, OptionKind.EXTRA, 'Extra');
        }

        return {
            idBeverage: bebida.id,
            basePrice: bebida.basePrice,
            surcharges: recargos,
            total: bebida.basePrice + recargos,
            breakdown: desglose,
            warnings: tamano ? [] : ['No se eligió tamaño: se cobrará solo el precio base.'],
        };
    }
}
