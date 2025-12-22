const express = require('express');
const db = require('../database');
const { syncAllRoutes, getDefaultSearchDate } = require('../crawler');

const router = express.Router();

// 헬스체크
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 수동 동기화
router.post('/api/sync', async (req, res) => {
  try {
    const date = req.body.date || getDefaultSearchDate();
    const routes = await syncAllRoutes(date);
    res.json({ success: true, count: routes.length, date });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 노선코드로 검색
router.get('/api/routes/code/:code', (req, res) => {
  const routes = db.searchByLineCode(req.params.code);
  res.json(routes);
});

// 노선명으로 검색
router.get('/api/routes/name/:name', (req, res) => {
  const routes = db.searchByLineName(req.params.name);
  res.json(routes);
});

// 차량번호로 검색
router.get('/api/routes/car/:number', (req, res) => {
  const routes = db.searchByCarNumber(req.params.number);
  res.json(routes);
});

// 날짜별 검색
router.get('/api/routes/date/:date', (req, res) => {
  const routes = db.searchByDate(req.params.date);
  res.json(routes);
});

// 날짜별 통계
router.get('/api/stats/:date', (req, res) => {
  const stats = db.getStatsByDate(req.params.date);
  res.json(stats);
});

module.exports = router;
