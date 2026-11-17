import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Beverage, DrinkType, Flavor, MenuOption, OptionKind } from '../dominio/entidades';
import {
    IngredientReference,
    MenuRepository,
    RecipeItemData,
} from '../dominio/menu.repository';

@Injectable()
export class PrismaMenuRepository implements MenuRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAllTypes(): Promise<DrinkType[]> {
        return (await this.prisma.drinkType.findMany({ orderBy: { id: 'asc' } })) as DrinkType[];
    }

    async findDrinkType(id: number): Promise<DrinkType | null> {
        const fila = await this.prisma.drinkType.findUnique({ where: { id } });
        return fila ?? null;
    }

    async createDrinkType(name: string): Promise<DrinkType> {
        return await this.prisma.drinkType.create({ data: { name } });
    }

    async setTypeActive(id: number, isActive: boolean): Promise<DrinkType> {
        return await this.prisma.drinkType.update({ where: { id }, data: { isActive } });
    }

    async findFlavors(idDrinkType?: number): Promise<Flavor[]> {
        return (await this.prisma.flavor.findMany({
            where: idDrinkType ? { idDrinkType } : undefined,
            orderBy: { id: 'asc' },
        })) as Flavor[];
    }

    async findFlavor(id: number): Promise<Flavor | null> {
        return await this.prisma.flavor.findUnique({ where: { id } });
    }

    async createFlavor(idDrinkType: number, name: string): Promise<Flavor> {
        return await this.prisma.flavor.create({ data: { idDrinkType, name } });
    }

    async setFlavorActive(id: number, isActive: boolean): Promise<Flavor> {
        return await this.prisma.flavor.update({ where: { id }, data: { isActive } });
    }

    async findAllOptions(): Promise<MenuOption[]> {
        const filas = await this.prisma.menuOption.findMany({ orderBy: { id: 'asc' } });
        return filas.map((fila) => ({ ...fila, kind: fila.kind as OptionKind }));
    }

    async findOption(id: number): Promise<MenuOption | null> {
        const fila = await this.prisma.menuOption.findUnique({ where: { id } });
        return fila ? { ...fila, kind: fila.kind as OptionKind } : null;
    }

    async createOption(kind: OptionKind, name: string, surcharge: number): Promise<MenuOption> {
        const fila = await this.prisma.menuOption.create({ data: { kind, name, surcharge } });
        return { ...fila, kind: fila.kind as OptionKind };
    }

    async setOptionActive(id: number, isActive: boolean): Promise<MenuOption> {
        const fila = await this.prisma.menuOption.update({ where: { id }, data: { isActive } });
        return { ...fila, kind: fila.kind as OptionKind };
    }

    async findAllBeverages(): Promise<Beverage[]> {
        const filas = await this.prisma.beverage.findMany({
            orderBy: { id: 'asc' },
            include: { recipe: { include: { items: true } } },
        });
        return filas.map((fila) => this.aBebida(fila));
    }

    async findBeverage(id: number): Promise<Beverage | null> {
        const fila = await this.prisma.beverage.findUnique({
            where: { id },
            include: { recipe: { include: { items: true } } },
        });
        return fila ? this.aBebida(fila) : null;
    }

    async createBeverage(datos: {
        name: string;
        idDrinkType: number;
        idFlavor: number;
        basePrice: number;
        allowsMilk: boolean;
    }): Promise<Beverage> {
        // RN-03: se crea desactivada; la dueña la activa cuando ya tiene receta.
        const fila = await this.prisma.beverage.create({
            data: { ...datos, isActive: false },
            include: { recipe: true },
        });
        return this.aBebida(fila);
    }

    async setBeverageActive(id: number, isActive: boolean): Promise<Beverage> {
        const fila = await this.prisma.beverage.update({
            where: { id },
            data: { isActive },
            include: { recipe: { include: { items: true } } },
        });
        return this.aBebida(fila);
    }

    async updateBeveragePrice(id: number, basePrice: number): Promise<Beverage> {
        // RN-08/RN-50: solo cambia el precio base para pedidos futuros;
        // el precio congelado en order_details no se toca.
        const fila = await this.prisma.beverage.update({
            where: { id },
            data: { basePrice },
            include: { recipe: { include: { items: true } } },
        });
        return this.aBebida(fila);
    }

    async findIngredient(id: number): Promise<IngredientReference | null> {
        const fila = await this.prisma.ingredient.findUnique({ where: { id } });
        return fila ? { id: fila.id, name: fila.name } : null;
    }

    async saveRecipe(idBeverage: number, items: RecipeItemData[]): Promise<Beverage> {
        await this.prisma.$transaction(async (tx) => {
            const receta = await tx.recipe.upsert({
                where: { idBeverage },
                create: { idBeverage },
                update: {},
            });

            // RN-30 sobre recetas: se reemplaza la lista, no se edita el historial.
            await tx.recipeItem.deleteMany({ where: { idRecipe: receta.id } });
            await tx.recipeItem.createMany({
                data: items.map((item) => ({ idRecipe: receta.id, ...item })),
            });
        });

        const fila = await this.prisma.beverage.findUniqueOrThrow({
            where: { id: idBeverage },
            include: { recipe: { include: { items: true } } },
        });
        return this.aBebida(fila);
    }

    private aBebida(fila: {
        id: number;
        name: string;
        idDrinkType: number;
        idFlavor: number;
        basePrice: number;
        isActive: boolean;
        allowsMilk: boolean;
        recipe: { id: number; idBeverage: number; items?: unknown[] } | null;
    }): Beverage {
        return {
            id: fila.id,
            name: fila.name,
            idDrinkType: fila.idDrinkType,
            idFlavor: fila.idFlavor,
            basePrice: Number(fila.basePrice),
            isActive: fila.isActive,
            allowsMilk: fila.allowsMilk,
            recipe: fila.recipe
                ? {
                      id: fila.recipe.id,
                      idBeverage: fila.recipe.idBeverage,
                      hasItems: (fila.recipe.items?.length ?? 0) > 0,
                  }
                : null,
        };
    }
}
