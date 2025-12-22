import Database from 'better-sqlite3';
import type { Database as DatabaseType, Statement } from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Route, RouteInput, RouteStats } from './types/route.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db: DatabaseType = new Database(join(__dirname, '..', 'logistics.db'));

// 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_date TEXT NOT NULL,
    line_code TEXT NOT NULL,
    line_name TEXT,
    car_code TEXT,
    car_number TEXT,
    count INTEGER DEFAULT 0,
    quantity INTEGER DEFAULT 0,
    section_fare REAL DEFAULT 0,
    total_fare REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(search_date, line_code)
  );

  CREATE INDEX IF NOT EXISTS idx_routes_date ON routes(search_date);
  CREATE INDEX IF NOT EXISTS idx_routes_line_code ON routes(line_code);
  CREATE INDEX IF NOT EXISTS idx_routes_line_name ON routes(line_name);
  CREATE INDEX IF NOT EXISTS idx_routes_car_number ON routes(car_number);
`);

// 데이터 삽입/업데이트 (upsert)
const upsertRoute: Statement = db.prepare(`
  INSERT INTO routes (search_date, line_code, line_name, car_code, car_number, count, quantity, section_fare, total_fare)
  VALUES (@search_date, @line_code, @line_name, @car_code, @car_number, @count, @quantity, @section_fare, @total_fare)
  ON CONFLICT(search_date, line_code) DO UPDATE SET
    line_name = excluded.line_name,
    car_code = excluded.car_code,
    car_number = excluded.car_number,
    count = excluded.count,
    quantity = excluded.quantity,
    section_fare = excluded.section_fare,
    total_fare = excluded.total_fare,
    created_at = datetime('now', 'localtime')
`);

// 여러 건 삽입
export function insertRoutes(routes: RouteInput[]): number {
  const insert = db.transaction((items: RouteInput[]) => {
    for (const item of items) {
      upsertRoute.run(item);
    }
  });
  insert(routes);
  return routes.length;
}

// 검색 함수들
export function searchByLineCode(lineCode: string): Route[] {
  return db.prepare(`
    SELECT * FROM routes
    WHERE line_code LIKE ?
    ORDER BY search_date DESC
    LIMIT 50
  `).all(`%${lineCode}%`) as Route[];
}

export function searchByLineName(lineName: string): Route[] {
  return db.prepare(`
    SELECT * FROM routes
    WHERE line_name LIKE ?
    ORDER BY search_date DESC
    LIMIT 50
  `).all(`%${lineName}%`) as Route[];
}

export function searchByCarNumber(carNumber: string): Route[] {
  return db.prepare(`
    SELECT * FROM routes
    WHERE car_number LIKE ?
    ORDER BY search_date DESC
    LIMIT 50
  `).all(`%${carNumber}%`) as Route[];
}

export function searchByCarCode(carCode: string): Route[] {
  return db.prepare(`
    SELECT * FROM routes
    WHERE car_code LIKE ?
    ORDER BY search_date DESC
    LIMIT 50
  `).all(`%${carCode}%`) as Route[];
}

export function searchByDate(date: string): Route[] {
  return db.prepare(`
    SELECT * FROM routes
    WHERE search_date = ?
    ORDER BY line_code
  `).all(date) as Route[];
}

// 최근 데이터 조회
export function getRecentRoutes(limit: number = 20): Route[] {
  return db.prepare(`
    SELECT * FROM routes
    ORDER BY search_date DESC, line_code
    LIMIT ?
  `).all(limit) as Route[];
}

// 통계 조회
export function getStatsByDate(date: string): RouteStats {
  return db.prepare(`
    SELECT
      COUNT(*) as total_routes,
      SUM(count) as total_count,
      SUM(quantity) as total_quantity,
      SUM(section_fare) as total_section_fare,
      SUM(total_fare) as total_fare
    FROM routes
    WHERE search_date = ?
  `).get(date) as RouteStats;
}

export { db };
