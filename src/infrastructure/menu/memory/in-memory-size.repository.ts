import { Size } from "../../../domain/menu/entities/size.entity.js";
import { SizeRepository } from "../../../domain/menu/ports/size.repository.js";

export class InMemorySizeRepository implements SizeRepository {
    private readonly data = new Map<string, Size>();

    async findById(id: string): Promise<Size | null> {
        const found = this.data.get(id);
        return found ? { ...found } : null;
    }

    async findAll(): Promise<Size[]> {
        return [...this.data.values()].map((s) => ({ ...s }));
    }

    async save(entity: Size): Promise<Size> {
        this.data.set(entity.id, { ...entity });
        return { ...entity };
    }

    async delete(id: string): Promise<void> {
        this.data.delete(id);
    }
}