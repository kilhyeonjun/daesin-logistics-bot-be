import { Router } from 'express';
import { container } from 'tsyringe';
import { RouteController } from '../controllers/RouteController.js';
import { SyncController } from '../controllers/SyncController.js';
import { KakaoSkillController } from '../../kakao/KakaoSkillController.js';

export function createRoutes(): Router {
  const router = Router();

  const routeController = container.resolve(RouteController);
  const syncController = container.resolve(SyncController);
  const kakaoController = container.resolve(KakaoSkillController);

  // Health check
  router.get('/health', (req, res) => syncController.health(req, res));

  // Sync
  router.post('/api/sync', (req, res) => syncController.sync(req, res));

  // Route search APIs
  router.get('/api/routes/code/:code', (req, res) => routeController.findByCode(req, res));
  router.get('/api/routes/name/:name', (req, res) => routeController.findByName(req, res));
  router.get('/api/routes/car/:number', (req, res) => routeController.findByCar(req, res));
  router.get('/api/routes/date/:date', (req, res) => routeController.findByDate(req, res));
  router.get('/api/stats/:date', (req, res) => routeController.getStatsByDate(req, res));

  // Kakao skill webhook
  router.post('/kakao/skill', (req, res) => kakaoController.handleSkill(req, res));

  return router;
}
