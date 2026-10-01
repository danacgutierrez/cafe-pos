/** Generic interface that can be used for ALL the entities
 * to avoid the repitition of this methods in every repository*/ 
export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
}