import { describe, it, expect, beforeAll } from 'vitest';
import { container } from '../src/config/container.js';
import { TOKENS } from '../src/config/tokens.js';
import type { IRouteRepository } from '../src/domain/repositories/IRouteRepository.js';
import { Route } from '../src/domain/entities/Route.js';

describe('Database (PrismaRouteRepository)', () => {
  let repository: IRouteRepository;

  const testRoute = Route.create({
    searchDate: '20251220',
    lineCode: '999999',
    lineName: '테스트→도착지',
    carCode: '999999',
    carNumber: '테스트12가3456',
    count: 10,
    quantity: 20,
    sectionFare: 10000.5,
    totalFare: 15000.0,
  });

  beforeAll(async () => {
    repository = container.resolve<IRouteRepository>(TOKENS.RouteRepository);
    // 테스트 데이터 삽입
    await repository.upsertMany([testRoute]);
  });

  describe('upsertMany', () => {
    it('데이터 삽입 성공', async () => {
      const newRoute = Route.create({
        searchDate: '20251220',
        lineCode: '999998',
        lineName: '테스트2→도착지2',
        carCode: '999998',
        carNumber: '테스트34나5678',
        count: 5,
        quantity: 10,
        sectionFare: 5000,
        totalFare: 7500,
      });
      const count = await repository.upsertMany([newRoute]);
      expect(count).toBe(1);
    });

    it('중복 데이터 upsert 동작', async () => {
      const updatedRoute = Route.create({
        searchDate: '20251220',
        lineCode: '999999',
        lineName: '테스트→도착지',
        carCode: '999999',
        carNumber: '테스트12가3456',
        count: 99,
        quantity: 20,
        sectionFare: 10000.5,
        totalFare: 15000.0,
      });
      const count = await repository.upsertMany([updatedRoute]);
      expect(count).toBe(1);

      const results = await repository.findByLineCode('999999');
      expect(results[0].count).toBe(99);
    });
  });

  describe('findByLineCode', () => {
    it('노선코드로 검색', async () => {
      const results = await repository.findByLineCode('999999');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].lineCode).toBe('999999');
    });

    it('부분 일치 검색', async () => {
      const results = await repository.findByLineCode('9999');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('findByLineName', () => {
    it('노선명으로 검색', async () => {
      const results = await repository.findByLineName('테스트');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('findByCarNumber', () => {
    it('차량번호로 검색', async () => {
      const results = await repository.findByCarNumber('테스트12');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('findByDate', () => {
    it('날짜별 검색', async () => {
      const results = await repository.findByDate('20251220');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getStatsByDate', () => {
    it('통계 조회', async () => {
      const stats = await repository.getStatsByDate('20251220');
      expect(stats).toHaveProperty('totalRoutes');
      expect(stats).toHaveProperty('totalCount');
    });
  });

  describe('findRecent', () => {
    it('최근 데이터 조회', async () => {
      const results = await repository.findRecent(10);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(10);
    });
  });
});
