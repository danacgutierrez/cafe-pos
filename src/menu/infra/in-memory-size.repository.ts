import { Size } from "../domain/entities/size.entity";
import { SizeRepository } from "../domain/repositories/size.repository";

export class InMemorySizeRepository implements SizeRepository {
    private readonly data = new Map<string, Size>();

    async findById(id: string): Promise<Size | null> {
        const found = this.data.get(id);
        return found ? { ...found } : null;
    }

    async findAll(): Promise<Size[]> {
        return [...this.data.values()].map((e) => ({ ...e }));
    }

    async save(entity: Size): Promise<Size> {
        this.data.set(entity.id, { ...entity });
        return { ...entity };
    }

    async delete(id: string): Promise<void> {
        this.data.delete(id);
    }

    async findByName(name: string): Promise<Size | null> {
        const found = [...this.data.values()].find(
            (e) => e.name.toLowerCase() === name.toLowerCase(),
        );
        return found ? { ...found } : null;
    }
}
