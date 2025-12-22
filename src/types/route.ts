/**
 * 노선 데이터 타입 정의
 */

// 데이터베이스 Route 레코드
export interface Route {
  id?: number;
  search_date: string;      // YYYYMMDD
  line_code: string;        // 노선코드
  line_name: string | null; // 노선명
  car_code: string | null;  // 차종코드
  car_number: string | null;// 차량번호
  count: number;            // 출발횟수
  quantity: number;         // 물량
  section_fare: number;     // 구간요금
  total_fare: number;       // 합계요금
  created_at?: string;      // 생성일시
}

// Route 삽입용 (id, created_at 제외)
export interface RouteInput {
  search_date: string;
  line_code: string;
  line_name: string | null;
  car_code: string | null;
  car_number: string | null;
  count: number;
  quantity: number;
  section_fare: number;
  total_fare: number;
}

// 통계 데이터
export interface RouteStats {
  total_routes: number;
  total_count: number | null;
  total_quantity: number | null;
  total_section_fare: number | null;
  total_fare: number | null;
}

// 크롤링 옵션
export interface CrawlOptions {
  lineStart?: string;
  lineEnd?: string;
  lineName?: string;
  terminalCode?: string;
  searchOpt?: '1' | '2' | '3';
}
