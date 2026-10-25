import { User, UserRole } from "../domain/entities/user.entity";
import { UserRepository } from "../domain/repositories/user.repository";

export class InMemoryUserRepository implements UserRepository {
    private readonly data = new Map<string, User>();

    async findById(id: string): Promise<User | null> {
        const found = this.data.get(id);
        return found ? { ...found } : null;
    }

    async findAll(): Promise<User[]> {
        return [...this.data.values()].map((e) => ({ ...e }));
    }

    async save(entity: User): Promise<User> {
        this.data.set(entity.id, { ...entity });
        return { ...entity };
    }

    async delete(id: string): Promise<void> {
        this.data.delete(id);
    }

    async findByUsername(username: string): Promise<User | null> {
        const found = [...this.data.values()].find(
            (e) => e.username.toLowerCase() === username.toLowerCase(),
        );
        return found ? { ...found } : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const found = [...this.data.values()].find(
            (e) => e.email.toLowerCase() === email.toLowerCase(),
        );
        return found ? { ...found } : null;
    }

    async existsByRole(role: UserRole): Promise<boolean> {
        return [...this.data.values()].some((e) => e.role === role);
    }

    async existsStaffByLocationId(locationId: string): Promise<boolean> {
        return [...this.data.values()].some((e) => e.role === "staff" && e.locationId === locationId);
    }
}