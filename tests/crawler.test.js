import { describe, it, expect } from 'vitest';
import { crawlRoutes, getDefaultSearchDate } from '../src/crawler.js';

describe('Crawler', () => {
  describe('getDefaultSearchDate', () => {
    it('YYYYMMDD 형식 반환', () => {
      const date = getDefaultSearchDate();
      expect(date).toMatch(/^\d{8}$/);
    });

    it('8자리 숫자', () => {
      const date = getDefaultSearchDate();
      expect(date.length).toBe(8);
    });
  });

  describe('crawlRoutes', () => {
    it('실제 사이트에서 데이터 크롤링', async () => {
      const routes = await crawlRoutes('20251219', {
        lineStart: '101100',
        lineEnd: '101200'
      });

      expect(Array.isArray(routes)).toBe(true);
    }, 60000);

    it('크롤링 결과 데이터 구조 검증', async () => {
      const routes = await crawlRoutes('20251219', {
        lineStart: '101100',
        lineEnd: '101200'
      });

      if (routes.length > 0) {
        const route = routes[0];
        expect(route).toHaveProperty('search_date');
        expect(route).toHaveProperty('line_code');
        expect(route).toHaveProperty('line_name');
        expect(route).toHaveProperty('car_code');
        expect(route).toHaveProperty('car_number');
        expect(route).toHaveProperty('count');
        expect(route).toHaveProperty('quantity');
        expect(route).toHaveProperty('section_fare');
        expect(route).toHaveProperty('total_fare');
      }
    }, 60000);

    it('노선코드 6자리 형식 확인', async () => {
      const routes = await crawlRoutes('20251219', {
        lineStart: '101100',
        lineEnd: '101200'
      });

      routes.forEach(route => {
        expect(route.line_code).toMatch(/^\d{6}$/);
      });
    }, 60000);
  });
});
