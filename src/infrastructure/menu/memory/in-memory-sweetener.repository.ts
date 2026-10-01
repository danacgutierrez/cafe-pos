import { Sweetener } from "../../../domain/menu/entities/sweetener.entity.js";
import { SweetenerRepository } from "../../../domain/menu/ports/sweetener.repository.js";

export class InMemorySweetenerRepository implements SweetenerRepository {
  private readonly data = new Map<string, Sweetener>();

  async findById(id: string): Promise<Sweetener | null> {
    const found = this.data.get(id);
    return found ? { ...found } : null;
  }

  async findAll(): Promise<Sweetener[]> {
    return [...this.data.values()].map((s) => ({ ...s }));
  }

  async save(entity: Sweetener): Promise<Sweetener> {
    this.data.set(entity.id, { ...entity });
    return { ...entity };
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
  }
}