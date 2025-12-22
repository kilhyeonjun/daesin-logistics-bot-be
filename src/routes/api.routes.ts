import { Router, Request, Response } from 'express';
import * as db from '../database.js';
import { syncAllRoutes, getDefaultSearchDate } from '../crawler.js';

const router = Router();

// 헬스체크
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 수동 동기화
router.post('/api/sync', async (req: Request, res: Response) => {
  try {
    const date = (req.body as { date?: string }).date || getDefaultSearchDate();
    const routes = await syncAllRoutes(date);
    res.json({ success: true, count: routes.length, date });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// 노선코드로 검색
router.get('/api/routes/code/:code', (req: Request, res: Response) => {
  const routes = db.searchByLineCode(req.params.code);
  res.json(routes);
});

// 노선명으로 검색
router.get('/api/routes/name/:name', (req: Request, res: Response) => {
  const routes = db.searchByLineName(req.params.name);
  res.json(routes);
});

// 차량번호로 검색
router.get('/api/routes/car/:number', (req: Request, res: Response) => {
  const routes = db.searchByCarNumber(req.params.number);
  res.json(routes);
});

// 날짜별 검색
router.get('/api/routes/date/:date', (req: Request, res: Response) => {
  const routes = db.searchByDate(req.params.date);
  res.json(routes);
});

// 날짜별 통계
router.get('/api/stats/:date', (req: Request, res: Response) => {
  const stats = db.getStatsByDate(req.params.date);
  res.json(stats);
});

export default router;
