import { MilkType } from "../domain/entities/milk-type.entity";
import { MilkTypeRepository } from "../domain/repositories/milk-type.repository";

export class InMemoryMilkTypeRepository implements MilkTypeRepository {
    private readonly data = new Map<string, MilkType>();

    async findById(id: string): Promise<MilkType | null> {
        const found = this.data.get(id);
        return found ? { ...found } : null;
    }

    async findAll(): Promise<MilkType[]> {
        return [...this.data.values()].map((e) => ({ ...e }));
    }

    async save(entity: MilkType): Promise<MilkType> {
        this.data.set(entity.id, { ...entity });
        return { ...entity };
    }

    async delete(id: string): Promise<void> {
        this.data.delete(id);
    }

    async findByName(name: string): Promise<MilkType | null> {
        const found = [...this.data.values()].find(
            (e) => e.name.toLowerCase() === name.toLowerCase(),
        );
        return found ? { ...found } : null;
    }
}
