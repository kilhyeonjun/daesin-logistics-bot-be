import axios from 'axios';
import * as cheerio from 'cheerio';
import * as iconv from 'iconv-lite';
import { insertRoutes } from './database.js';
import type { RouteInput, CrawlOptions } from './types/route.js';

const BASE_URL = 'http://logistics.ds3211.co.kr/daesin/servlet/total.TotServlet';

// 숫자 파싱 (쉼표 제거)
function parseNumber(str: string | undefined): number {
  if (!str) return 0;
  const cleaned = str.replace(/,/g, '').trim();
  return parseFloat(cleaned) || 0;
}

// 오늘 또는 어제 날짜 (오후 2시 기준)
export function getDefaultSearchDate(): string {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  // 오후 2시 이전이면 전날 데이터
  if (hour < 14) {
    // 월요일이면 금요일 데이터
    if (day === 1) {
      now.setDate(now.getDate() - 3);
    } else if (day === 0) {
      now.setDate(now.getDate() - 2);
    } else {
      now.setDate(now.getDate() - 1);
    }
  }

  return now.toISOString().slice(0, 10).replace(/-/g, '');
}

// 크롤링 함수
export async function crawlRoutes(
  searchDate: string,
  options: CrawlOptions = {}
): Promise<RouteInput[]> {
  const {
    lineStart = '100000',
    lineEnd = '999999',
    lineName = '',
    terminalCode = '',
    searchOpt = '2' // 2=노선코드, 1=노선명, 3=터미널별
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
    arriveArea: ''
  });

  try {
    const response = await axios.post(BASE_URL, formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'arraybuffer',
      timeout: 60000
    });

    const html = iconv.decode(Buffer.from(response.data), 'euc-kr');
    const $ = cheerio.load(html);

    const routes: RouteInput[] = [];

    // 데이터 테이블 찾기 (130행 이상인 테이블)
    $('table.tab1').each((_i, table) => {
      const rows = $(table).find('tr');
      if (rows.length < 5) return;

      // 헤더 확인
      const firstRow = $(rows[0]).text();
      if (!firstRow.includes('노선코드')) return;

      // 데이터 행 파싱
      rows.slice(1).each((_j, row) => {
        const cols = $(row).find('td');
        if (cols.length < 10) return;

        const lineCode = $(cols[0]).text().trim();
        if (!lineCode || lineCode.length !== 6) return;

        const route: RouteInput = {
          search_date: searchDate,
          line_code: lineCode,
          line_name: $(cols[1]).text().trim(),
          car_code: $(cols[2]).text().trim(),
          car_number: $(cols[3]).text().trim(),
          count: parseInt($(cols[6]).text().trim()) || 0,
          quantity: parseInt($(cols[7]).text().trim()) || 0,
          section_fare: parseNumber($(cols[8]).text()),
          total_fare: parseNumber($(cols[9]).text())
        };

        routes.push(route);
      });
    });

    return routes;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('크롤링 에러:', message);
    throw error;
  }
}

// 전체 데이터 크롤링 및 저장
export async function syncAllRoutes(searchDate?: string): Promise<RouteInput[]> {
  const date = searchDate || getDefaultSearchDate();
  console.log(`[${new Date().toLocaleString()}] 크롤링 시작: ${date}`);

  try {
    // 전체 노선 크롤링 (100000 ~ 999999)
    const routes = await crawlRoutes(date, {
      lineStart: '100000',
      lineEnd: '999999'
    });

    if (routes.length > 0) {
      const inserted = insertRoutes(routes);
      console.log(`[${new Date().toLocaleString()}] ${inserted}건 저장 완료`);
    } else {
      console.log(`[${new Date().toLocaleString()}] 데이터 없음`);
    }

    return routes;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${new Date().toLocaleString()}] 동기화 실패:`, message);
    throw error;
  }
}
