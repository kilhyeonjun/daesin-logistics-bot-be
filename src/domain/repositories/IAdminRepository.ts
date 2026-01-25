import type { Admin } from '../entities/Admin.js';

export interface IAdminRepository {
  findByEmail(email: string): Promise<Admin | null>;
  findById(id: number): Promise<Admin | null>;
  create(admin: Admin): Promise<Admin>;
}
