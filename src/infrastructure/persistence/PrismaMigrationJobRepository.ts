import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import type { IMigrationJobRepository } from '../../domain/repositories/IMigrationJobRepository.js';
import { MigrationJob, type MigrationStatus } from '../../domain/entities/MigrationJob.js';
import { TOKENS } from '../../config/tokens.js';

@injectable()
export class PrismaMigrationJobRepository implements IMigrationJobRepository {
  constructor(
    @inject(TOKENS.PrismaClient)
    private readonly prisma: PrismaClient
  ) {}

  async create(job: MigrationJob): Promise<MigrationJob> {
    const record = await this.prisma.migrationJob.create({
      data: {
        startDate: job.startDate,
        endDate: job.endDate,
        status: job.status,
        currentDate: job.currentDate,
        totalDays: job.totalDays,
        completedDays: job.completedDays,
        errorMessage: job.errorMessage,
      },
    });
    return this.toDomain(record);
  }

  async findById(id: number): Promise<MigrationJob | null> {
    const record = await this.prisma.migrationJob.findUnique({
      where: { id },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<MigrationJob[]> {
    const records = await this.prisma.migrationJob.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map(this.toDomain);
  }

  async findActive(): Promise<MigrationJob | null> {
    const record = await this.prisma.migrationJob.findFirst({
      where: {
        status: { in: ['pending', 'running'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    return record ? this.toDomain(record) : null;
  }

  async update(job: MigrationJob): Promise<MigrationJob> {
    const now = new Date().toISOString();
    const record = await this.prisma.migrationJob.update({
      where: { id: job.id },
      data: {
        status: job.status,
        currentDate: job.currentDate,
        completedDays: job.completedDays,
        errorMessage: job.errorMessage,
        updatedAt: now,
      },
    });
    return this.toDomain(record);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.migrationJob.delete({
      where: { id },
    });
  }

  private toDomain(record: {
    id: number;
    startDate: string;
    endDate: string;
    status: string;
    currentDate: string | null;
    totalDays: number;
    completedDays: number;
    errorMessage: string | null;
    createdAt: string;
    updatedAt: string | null;
  }): MigrationJob {
    return new MigrationJob({
      id: record.id,
      startDate: record.startDate,
      endDate: record.endDate,
      status: record.status as MigrationStatus,
      currentDate: record.currentDate,
      totalDays: record.totalDays,
      completedDays: record.completedDays,
      errorMessage: record.errorMessage,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
