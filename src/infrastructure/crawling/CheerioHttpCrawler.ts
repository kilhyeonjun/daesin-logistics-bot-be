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
const RACE_INFO_BASE = 'http://logistics.ds3211.co.kr/daesin/jsp/zraceInfo/mobile/raceInfoPopup.jsp';
const CAR_DETAIL_BASE = 'http://logistics.ds3211.co.kr/daesin/jsp/total/lineGoodsTot_detail.jsp';
const TRACKING_BASE = 'http://custom.ds3211.co.kr/vcSvl';
const TRACKING_API_KEY = '58d01815eb9b10a79ce08e6d08a6a63f';
const WAYPOINT_BASE = 'http://www.ds3211.co.kr/mobile/loadPlan/list.jsp';

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

          const carCode = $(cols[2]).text().trim() || null;
          const carNumber = $(cols[3]).text().trim() || null;

          const route = Route.create({
            searchDate: searchDate,
            lineCode: lineCode,
            lineName: $(cols[1]).text().trim() || null,
            carCode: carCode,
            carNumber: carNumber,
            count: parseInt($(cols[6]).text().trim()) || 0,
            quantity: parseInt($(cols[7]).text().trim()) || 0,
            sectionFare: this.parseNumber($(cols[8]).text()),
            totalFare: this.parseNumber($(cols[9]).text()),
            raceInfoUrl: carCode ? `${RACE_INFO_BASE}?carNumber=${carCode}` : null,
            carDetailUrl: carCode ? `${CAR_DETAIL_BASE}?carcode=${carCode}` : null,
            trackingUrl: carNumber ? `${TRACKING_BASE}?apiKey=${TRACKING_API_KEY}&carNumber=${encodeURIComponent(carNumber)}` : null,
            waypointUrl: `${WAYPOINT_BASE}?inputDate=${searchDate}&streetCode=${lineCode}`,
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
