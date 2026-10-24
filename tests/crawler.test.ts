import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import iconv from 'iconv-lite';
import { CheerioHttpCrawler } from '../src/infrastructure/crawling/CheerioHttpCrawler.js';
import { CrawlingError } from '../src/shared/errors/DomainError.js';

const header = '<tr><th>노선코드</th><th>노선명</th></tr>';

function row(lineCode = '900001', count = '12', quantity = '34'): string {
  return `<tr>
    <td>${lineCode}</td><td>서울 → 부산</td><td>CAR001</td><td>서울12가3456</td>
    <td></td><td></td><td>${count}</td><td>${quantity}</td><td>1,200.5</td><td>3,400</td>
  </tr>`;
}

function respondWith(html: string): void {
  vi.mocked(axios.post).mockResolvedValueOnce({ data: iconv.encode(html, 'euc-kr') });
}

describe('CheerioHttpCrawler', () => {
  let crawler: CheerioHttpCrawler;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('Unexpected unconfigured HTTP request'));
    crawler = new CheerioHttpCrawler();
  });

  afterEach(() => vi.restoreAllMocks());

  it('preserves a single route and decodes Korean EUC-KR content', async () => {
    respondWith(`<table class="tab1">${header}${row()}</table>`);

    const routes = await crawler.crawl('20261024');

    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({
      searchDate: '20261024',
      lineCode: '900001',
      lineName: '서울 → 부산',
      carCode: 'CAR001',
      carNumber: '서울12가3456',
      count: 12,
      quantity: 34,
      sectionFare: 1200.5,
      totalFare: 3400,
    });
  });

  it('accepts a recognized table containing only its header as empty', async () => {
    respondWith(`<table class="tab1">${header}</table>`);

    await expect(crawler.crawl('20261024')).resolves.toEqual([]);
  });

  it.each([
    ['1,234', '2,345', 1234, 2345],
    ['1,234.9', '2,345.8', 1234, 2345],
    ['', '', 0, 0],
  ])('parses count %s and quantity %s with integer semantics', async (count, quantity, expectedCount, expectedQuantity) => {
    respondWith(`<table class="tab1">${header}${row('900001', count, quantity)}</table>`);

    const routes = await crawler.crawl('20261024');

    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({ count: expectedCount, quantity: expectedQuantity });
  });

  it('excludes layout tables without the route class or header', async () => {
    respondWith(`
      <table>${header}${row('900002')}</table>
      <table class="tab1"><tr><th>배차 안내</th></tr>${row('900003')}</table>
      <table class="tab1">${header}${row()}</table>
    `);

    const routes = await crawler.crawl('20261024');

    expect(routes.map((route) => route.lineCode)).toEqual(['900001']);
  });

  it('reports a transport failure rather than returning an empty result', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('synthetic transport failure'));

    await expect(crawler.crawl('20261024')).rejects.toBeInstanceOf(CrawlingError);
  });
});
