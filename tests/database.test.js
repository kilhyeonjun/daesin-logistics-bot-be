import { describe, it, expect, beforeAll } from 'vitest';
import db from '../src/database.js';

describe('Database', () => {
  const testRoute = {
    search_date: '20251220',
    line_code: '999999',
    line_name: '테스트→도착지',
    car_code: '999999',
    car_number: '테스트12가3456',
    count: 10,
    quantity: 20,
    section_fare: 10000.5,
    total_fare: 15000.0
  };

  beforeAll(() => {
    // 테스트 데이터 삽입
    db.insertRoutes([testRoute]);
  });

  describe('insertRoutes', () => {
    it('데이터 삽입 성공', () => {
      const newRoute = {
        ...testRoute,
        line_code: '999998',
        line_name: '테스트2→도착지2'
      };
      const count = db.insertRoutes([newRoute]);
      expect(count).toBe(1);
    });

    it('중복 데이터 upsert 동작', () => {
      const updatedRoute = {
        ...testRoute,
        count: 99
      };
      const count = db.insertRoutes([updatedRoute]);
      expect(count).toBe(1);

      const results = db.searchByLineCode('999999');
      expect(results[0].count).toBe(99);
    });
  });

  describe('searchByLineCode', () => {
    it('노선코드로 검색', () => {
      const results = db.searchByLineCode('999999');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].line_code).toBe('999999');
    });

    it('부분 일치 검색', () => {
      const results = db.searchByLineCode('9999');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('searchByLineName', () => {
    it('노선명으로 검색', () => {
      const results = db.searchByLineName('테스트');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('searchByCarNumber', () => {
    it('차량번호로 검색', () => {
      const results = db.searchByCarNumber('테스트12');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('searchByDate', () => {
    it('날짜별 검색', () => {
      const results = db.searchByDate('20251220');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getStatsByDate', () => {
    it('통계 조회', () => {
      const stats = db.getStatsByDate('20251220');
      expect(stats).toHaveProperty('total_routes');
      expect(stats).toHaveProperty('total_count');
    });
  });

  describe('getRecentRoutes', () => {
    it('최근 데이터 조회', () => {
      const results = db.getRecentRoutes(10);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(10);
    });
  });
});
