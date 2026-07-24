import { describe, expect, it } from 'vitest';
import { container } from '../src/config/container.js';
import { TOKENS } from '../src/config/tokens.js';
import { MigrationJob } from '../src/domain/entities/MigrationJob.js';
import type { IMigrationJobRepository } from '../src/domain/repositories/IMigrationJobRepository.js';
import { Admin } from '../src/domain/entities/Admin.js';
import type { IAdminRepository } from '../src/domain/repositories/IAdminRepository.js';
import { readFileSync } from 'node:fs';

describe('persistence createdAt', () => {
  it('Prisma schema가 SQL 함수를 문자열 기본값으로 저장하지 않는다', () => {
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    const seedAdmin = readFileSync('scripts/seed-admin.ts', 'utf8');

    expect(schema).not.toContain('@default("datetime(\'now\', \'localtime\')")');
    expect(seedAdmin).toContain('createdAt: new Date().toISOString()');
  });

  it('신규 migration job에 실제 ISO 시각을 저장한다', async () => {
    const repository = container.resolve<IMigrationJobRepository>(TOKENS.MigrationJobRepository);
    const saved = await repository.create(MigrationJob.create('20990101', '20990101', 1));

    expect(saved.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('신규 admin에 실제 ISO 시각을 저장한다', async () => {
    const repository = container.resolve<IAdminRepository>(TOKENS.AdminRepository);
    const email = `timestamp-${Date.now()}@example.com`;
    const saved = await repository.create(
      Admin.create({ email, passwordHash: 'test-only-hash', name: 'Timestamp Test' })
    );

    expect(saved.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
