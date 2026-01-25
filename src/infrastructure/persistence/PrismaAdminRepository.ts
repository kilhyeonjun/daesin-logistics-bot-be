import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import type { IAdminRepository } from '../../domain/repositories/IAdminRepository.js';
import { Admin } from '../../domain/entities/Admin.js';
import { TOKENS } from '../../config/tokens.js';

@injectable()
export class PrismaAdminRepository implements IAdminRepository {
  constructor(
    @inject(TOKENS.PrismaClient)
    private readonly prisma: PrismaClient
  ) {}

  async findByEmail(email: string): Promise<Admin | null> {
    const record = await this.prisma.admin.findUnique({
      where: { email },
    });
    return record ? this.toDomain(record) : null;
  }

  async findById(id: number): Promise<Admin | null> {
    const record = await this.prisma.admin.findUnique({
      where: { id },
    });
    return record ? this.toDomain(record) : null;
  }

  async create(admin: Admin): Promise<Admin> {
    const record = await this.prisma.admin.create({
      data: {
        email: admin.email,
        passwordHash: admin.passwordHash,
        name: admin.name,
      },
    });
    return this.toDomain(record);
  }

  private toDomain(record: {
    id: number;
    email: string;
    passwordHash: string;
    name: string | null;
    createdAt: string;
    updatedAt: string | null;
  }): Admin {
    return new Admin({
      id: record.id,
      email: record.email,
      passwordHash: record.passwordHash,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
