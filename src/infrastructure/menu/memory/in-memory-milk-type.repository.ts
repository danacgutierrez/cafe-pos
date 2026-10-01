import { MilkType } from "../../../domain/menu/entities/milk-type.entity.js";
import { MilkTypeRepository } from "../../../domain/menu/ports/milk-type.repository.js";

export class InMemoryMilkTypeRepository implements MilkTypeRepository {
  private readonly data = new Map<string, MilkType>();

  async findById(id: string): Promise<MilkType | null> {
    const found = this.data.get(id);
    return found ? { ...found } : null;
  }

  async findAll(): Promise<MilkType[]> {
    return [...this.data.values()].map((m) => ({ ...m }));
  }

  async save(entity: MilkType): Promise<MilkType> {
    this.data.set(entity.id, { ...entity });
    return { ...entity };
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
  }
}