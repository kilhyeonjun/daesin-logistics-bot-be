import 'reflect-metadata';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SearchRoutesByCodeUseCase } from '../src/application/use-cases/SearchRoutesByCodeUseCase.js';
import { SyncRoutesUseCase } from '../src/application/use-cases/SyncRoutesUseCase.js';
import { Route } from '../src/domain/entities/Route.js';
import type { ICrawler } from '../src/domain/ports/ICrawler.js';
import { PrismaRouteRepository } from '../src/infrastructure/persistence/PrismaRouteRepository.js';

const require = createRequire(import.meta.url);
const projectRoot = fileURLToPath(new URL('../', import.meta.url));

function route(searchDate: string, lineCode: string, count: number): Route {
  return Route.create({
    searchDate,
    lineCode,
    lineName: 'Synthetic route',
    carCode: 'TEST01',
    carNumber: 'TEST-1234',
    count,
    quantity: count * 2,
    sectionFare: 1234.5,
    totalFare: 2345.5,
    raceInfoUrl: '/synthetic/race',
    carDetailUrl: '/synthetic/car',
    waypointUrl: '/synthetic/waypoint',
  });
}

describe('independent writer ingestion freshness', () => {
  let temporaryDirectory: string | undefined;
  let readerClient: PrismaClient | undefined;
  let writerClient: PrismaClient | undefined;
  let writer: PrismaRouteRepository;
  let reader: SearchRoutesByCodeUseCase;

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'daesin-freshness-'));
    const databaseUrl = `file:${join(temporaryDirectory, 'freshness.db')}`;

    // Use the real schema and installed CLI, with an explicit owned database only.
    execFileSync(process.execPath, [
      require.resolve('prisma/build/index.js'),
      'db', 'push',
      '--schema', join(projectRoot, 'prisma/schema.prisma'),
      '--skip-generate',
    ], {
      cwd: projectRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
      timeout: 30_000,
    });

    readerClient = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    writerClient = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    writer = new PrismaRouteRepository(writerClient);
    reader = new SearchRoutesByCodeUseCase(new PrismaRouteRepository(readerClient));
  }, 40_000);

  beforeEach(async () => {
    await writerClient!.route.deleteMany();
  });

  afterAll(async () => {
    try {
      await Promise.all([readerClient?.$disconnect(), writerClient?.$disconnect()]);
    } finally {
      if (temporaryDirectory) {
        await rm(temporaryDirectory, { recursive: true, force: true });
      }
    }
  });

  async function synchronize(date: string, routes: Route[]) {
    const crawler: ICrawler = { crawl: async () => routes };
    return new SyncRoutesUseCase(crawler, writer).execute(date);
  }

  it('the same reader sees committed insertion, correction and replay without waiting', async () => {
    const date = '20000102';
    expect(await reader.execute('900')).toEqual([]);

    expect(await synchronize(date, [route(date, '900001', 10)])).toEqual({
      success: true, count: 1, date,
    });
    const initial = await reader.execute('900');
    expect(initial).toHaveLength(1);
    expect(initial[0]).toMatchObject({ lineCode: '900001', count: 10 });

    expect(await synchronize(date, [route(date, '900001', 20), route(date, '900002', 30)]))
      .toEqual({ success: true, count: 2, date });
    const corrected = await reader.execute('900');
    expect(corrected).toHaveLength(2);
    expect(corrected.find((entry) => entry.lineCode === '900001')).toMatchObject({ count: 20 });
    expect(corrected.find((entry) => entry.lineCode === '900002')).toMatchObject({ count: 30 });

    // Count remains the number of upsert operations, not newly inserted rows.
    expect(await synchronize(date, [route(date, '900001', 20), route(date, '900002', 30)]))
      .toEqual({ success: true, count: 2, date });
    expect(await writerClient!.route.count()).toBe(2);
    expect(await reader.execute('900')).toEqual(corrected);
  });

  it('historical corrections are visible and preserve first-insertion createdAt', async () => {
    const historicalDate = '20000101';
    const laterDate = '20000102';
    await synchronize(historicalDate, [route(historicalDate, '900001', 10)]);
    await synchronize(laterDate, [route(laterDate, '900001', 30)]);

    const inserted = await writerClient!.route.findUniqueOrThrow({
      where: { searchDate_lineCode: { searchDate: historicalDate, lineCode: '900001' } },
    });
    expect(inserted.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    // A fixed old timestamp makes an accidental update detectable without sleeps.
    const firstInsertionTime = '2000-01-01T00:00:00.000Z';
    await writerClient!.route.update({
      where: { id: inserted.id },
      data: { createdAt: firstInsertionTime },
    });
    expect((await reader.execute('900001')).map((entry) => entry.count)).toEqual([30, 10]);

    await synchronize(historicalDate, [route(historicalDate, '900001', 99)]);
    const corrected = await reader.execute('900001');
    expect(corrected.map((entry) => [entry.searchDate, entry.count])).toEqual([
      [laterDate, 30], [historicalDate, 99],
    ]);
    expect(corrected[1]).toEqual({
      id: inserted.id,
      searchDate: historicalDate,
      lineCode: '900001',
      lineName: 'Synthetic route',
      carCode: 'TEST01',
      carNumber: 'TEST-1234',
      count: 99,
      quantity: 198,
      sectionFare: 1234.5,
      totalFare: 2345.5,
      raceInfoUrl: '/synthetic/race',
      carDetailUrl: '/synthetic/car',
      waypointUrl: '/synthetic/waypoint',
    });
    expect((await writerClient!.route.findUniqueOrThrow({ where: { id: inserted.id } })).createdAt)
      .toBe(firstInsertionTime);
  });

  it('retains substring matching, descending dates and the 50-row limit', async () => {
    const dates = Array.from({ length: 51 }, (_, index) =>
      new Date(Date.UTC(2000, 0, index + 1)).toISOString().slice(0, 10).replaceAll('-', '')
    );
    await writer.upsertMany(dates.map((date) => route(date, '900001', 1)));
    await writer.upsertMany([route('20000301', '800001', 2)]);

    const results = await reader.execute('900');
    expect(results).toHaveLength(50);
    expect(results.map((entry) => entry.searchDate)).toEqual(dates.slice(1).reverse());
    expect(results.every((entry) => entry.lineCode === '900001')).toBe(true);
  });
});
