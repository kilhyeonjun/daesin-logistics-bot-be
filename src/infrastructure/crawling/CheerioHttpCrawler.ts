import { injectable } from 'tsyringe';
import axios from 'axios';
import * as cheerio from 'cheerio';
import iconvModule from 'iconv-lite';
import type { ICrawler, CrawlOptions } from '../../domain/ports/ICrawler.js';
import { Route } from '../../domain/entities/Route.js';
import { CrawlingError } from '../../shared/errors/DomainError.js';

// Cast to any to handle iconv-lite ESM interop type issues
const iconv = iconvModule as unknown as {
  decode: (buffer: Buffer, encoding: string) => string;
};

const BASE_URL = 'http://logistics.ds3211.co.kr/daesin/servlet/total.TotServlet';

@injectable()
export class CheerioHttpCrawler implements ICrawler {
  async crawl(searchDate: string, options: CrawlOptions = {}): Promise<Route[]> {
    const {
      lineStart = '100000',
      lineEnd = '999999',
      lineName = '',
      terminalCode = '',
      searchOpt = '2',
    } = options;

    const formData = new URLSearchParams({
      mode: '1',
      menuid: '27',
      level: '01',
      levelgrade: 'Y',
      centercode: '',
      agencyCode: '',
      cryptoKey: '',
      fdate: searchDate,
      searchDelayed: '',
      searchOpt: searchOpt,
      line1: lineStart,
      line2: lineEnd,
      lineName: lineName,
      terminalCode: terminalCode,
      arriveArea: '',
    });

    try {
      const response = await axios.post(BASE_URL, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        responseType: 'arraybuffer',
        timeout: 60000,
      });

      const html = iconv.decode(Buffer.from(response.data), 'euc-kr');
      const $ = cheerio.load(html);

      const routes: Route[] = [];

      $('table.tab1').each((_i, table) => {
        const rows = $(table).find('tr');
        if (rows.length < 5) return;

        const firstRow = $(rows[0]).text();
        if (!firstRow.includes('노선코드')) return;

        rows.slice(1).each((_j, row) => {
          const cols = $(row).find('td');
          if (cols.length < 10) return;

          const lineCode = $(cols[0]).text().trim();
          if (!lineCode || lineCode.length !== 6) return;

          const route = Route.create({
            searchDate: searchDate,
            lineCode: lineCode,
            lineName: $(cols[1]).text().trim() || null,
            carCode: $(cols[2]).text().trim() || null,
            carNumber: $(cols[3]).text().trim() || null,
            count: parseInt($(cols[6]).text().trim()) || 0,
            quantity: parseInt($(cols[7]).text().trim()) || 0,
            sectionFare: this.parseNumber($(cols[8]).text()),
            totalFare: this.parseNumber($(cols[9]).text()),
          });

          routes.push(route);
        });
      });

      return routes;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new CrawlingError(message);
    }
  }

  private parseNumber(str: string | undefined): number {
    if (!str) return 0;
    const cleaned = str.replace(/,/g, '').trim();
    return parseFloat(cleaned) || 0;
  }
}
