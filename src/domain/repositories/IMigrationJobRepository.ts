import type { MigrationJob } from '../entities/MigrationJob.js';

export interface IMigrationJobRepository {
  create(job: MigrationJob): Promise<MigrationJob>;
  findById(id: number): Promise<MigrationJob | null>;
  findAll(): Promise<MigrationJob[]>;
  findActive(): Promise<MigrationJob | null>;
  update(job: MigrationJob): Promise<MigrationJob>;
  delete(id: number): Promise<void>;
}
