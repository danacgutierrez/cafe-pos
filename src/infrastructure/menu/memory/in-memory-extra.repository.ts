import { ExtraRepository } from "../../../domain/menu/ports/extra.repository.js";
import { Extra } from "../../../domain/menu/entities/extra.entity.js";

export class InMemoryExtraRepository implements ExtraRepository {
  private readonly data = new Map<string, Extra>();

  async findById(id: string): Promise<Extra | null> {
    const found = this.data.get(id);
    return found ? { ...found } : null;
  }

  async findAll(): Promise<Extra[]> {
    return [...this.data.values()].map((e) => ({ ...e }));
  }

  async save(entity: Extra): Promise<Extra> {
    this.data.set(entity.id, { ...entity });
    return { ...entity };
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
  }

  async findByName(name: string): Promise<Extra | null> {
    const found = [...this.data.values()].find(
      (e) => e.name.toLowerCase() === name.toLowerCase(),
    );
    return found ? { ...found } : null;
  }
}