import { describe, it, expect } from 'vitest';
import { container } from '../src/config/container.js';
import { TOKENS } from '../src/config/tokens.js';
import type { ICrawler } from '../src/domain/ports/ICrawler.js';
import { SearchDate } from '../src/domain/value-objects/SearchDate.js';

describe('Crawler (CheerioHttpCrawler)', () => {
  describe('SearchDate.defaultForCrawling', () => {
    it('YYYYMMDD 형식 반환', () => {
      const date = SearchDate.defaultForCrawling();
      expect(date.getValue()).toMatch(/^\d{8}$/);
    });

    it('8자리 숫자', () => {
      const date = SearchDate.defaultForCrawling();
      expect(date.getValue().length).toBe(8);
    });
  });

  describe('ICrawler.crawl', () => {
    it('실제 사이트에서 데이터 크롤링', async () => {
      const crawler = container.resolve<ICrawler>(TOKENS.Crawler);
      const routes = await crawler.crawl('20251219', {
        lineStart: '101100',
        lineEnd: '101200',
      });

      expect(Array.isArray(routes)).toBe(true);
    }, 60000);

    it('크롤링 결과 데이터 구조 검증', async () => {
      const crawler = container.resolve<ICrawler>(TOKENS.Crawler);
      const routes = await crawler.crawl('20251219', {
        lineStart: '101100',
        lineEnd: '101200',
      });

      if (routes.length > 0) {
        const route = routes[0];
        expect(route).toHaveProperty('searchDate');
        expect(route).toHaveProperty('lineCode');
        expect(route).toHaveProperty('lineName');
        expect(route).toHaveProperty('carCode');
        expect(route).toHaveProperty('carNumber');
        expect(route).toHaveProperty('count');
        expect(route).toHaveProperty('quantity');
        expect(route).toHaveProperty('sectionFare');
        expect(route).toHaveProperty('totalFare');
      }
    }, 60000);

    it('노선코드 6자리 형식 확인', async () => {
      const crawler = container.resolve<ICrawler>(TOKENS.Crawler);
      const routes = await crawler.crawl('20251219', {
        lineStart: '101100',
        lineEnd: '101200',
      });

      routes.forEach((route) => {
        expect(route.lineCode).toMatch(/^\d{6}$/);
      });
    }, 60000);
  });
});
