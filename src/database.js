const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'logistics.db'));

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
const upsertRoute = db.prepare(`
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
function insertRoutes(routes) {
  const insert = db.transaction((items) => {
    for (const item of items) {
      upsertRoute.run(item);
    }
  });
  insert(routes);
  return routes.length;
}

// 검색 함수들
function searchByLineCode(lineCode) {
  return db.prepare(`
    SELECT * FROM routes
    WHERE line_code LIKE ?
    ORDER BY search_date DESC
    LIMIT 50
  `).all(`%${lineCode}%`);
}

function searchByLineName(lineName) {
  return db.prepare(`
    SELECT * FROM routes
    WHERE line_name LIKE ?
    ORDER BY search_date DESC
    LIMIT 50
  `).all(`%${lineName}%`);
}

function searchByCarNumber(carNumber) {
  return db.prepare(`
    SELECT * FROM routes
    WHERE car_number LIKE ?
    ORDER BY search_date DESC
    LIMIT 50
  `).all(`%${carNumber}%`);
}

function searchByCarCode(carCode) {
  return db.prepare(`
    SELECT * FROM routes
    WHERE car_code LIKE ?
    ORDER BY search_date DESC
    LIMIT 50
  `).all(`%${carCode}%`);
}

function searchByDate(date) {
  return db.prepare(`
    SELECT * FROM routes
    WHERE search_date = ?
    ORDER BY line_code
  `).all(date);
}

// 최근 데이터 조회
function getRecentRoutes(limit = 20) {
  return db.prepare(`
    SELECT * FROM routes
    ORDER BY search_date DESC, line_code
    LIMIT ?
  `).all(limit);
}

// 통계 조회
function getStatsByDate(date) {
  return db.prepare(`
    SELECT
      COUNT(*) as total_routes,
      SUM(count) as total_count,
      SUM(quantity) as total_quantity,
      SUM(section_fare) as total_section_fare,
      SUM(total_fare) as total_fare
    FROM routes
    WHERE search_date = ?
  `).get(date);
}

module.exports = {
  db,
  insertRoutes,
  searchByLineCode,
  searchByLineName,
  searchByCarNumber,
  searchByCarCode,
  searchByDate,
  getRecentRoutes,
  getStatsByDate
};
