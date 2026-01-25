import { Router } from 'express';
import { container } from 'tsyringe';
import { RouteController } from '../controllers/RouteController.js';
import { SyncController } from '../controllers/SyncController.js';
import { MigrationController } from '../controllers/MigrationController.js';
import { AuthController } from '../controllers/AuthController.js';
import { KakaoSkillController } from '../../kakao/KakaoSkillController.js';
import { apiKeyAuth } from '../../../shared/middleware/apiKeyAuth.js';
import { adminAuth } from '../../../shared/middleware/adminAuth.js';

export function createRoutes(): Router {
  const router = Router();

  const routeController = container.resolve(RouteController);
  const syncController = container.resolve(SyncController);
  const migrationController = new MigrationController();
  const authController = container.resolve(AuthController);
  const kakaoController = container.resolve(KakaoSkillController);

  // Health check
  router.get('/health', (req, res) => syncController.health(req, res));

  router.post('/api/auth/login', apiKeyAuth, (req, res) => authController.login(req, res));
  router.get('/api/auth/me', apiKeyAuth, adminAuth, (req, res) => authController.me(req, res));

  // Sync
  router.post('/api/sync', apiKeyAuth, (req, res) => syncController.sync(req, res));

  // Route search APIs
  router.get('/api/routes/code/:code', apiKeyAuth, (req, res) => routeController.findByCode(req, res));
  router.get('/api/routes/name/:name', apiKeyAuth, (req, res) => routeController.findByName(req, res));
  router.get('/api/routes/car/:number', apiKeyAuth, (req, res) => routeController.findByCar(req, res));
  router.get('/api/routes/date/:date', apiKeyAuth, (req, res) => routeController.findByDate(req, res));
  router.get('/api/stats/:date', apiKeyAuth, (req, res) => routeController.getStatsByDate(req, res));

  router.post('/api/migration', apiKeyAuth, adminAuth, (req, res) => migrationController.startMigration(req, res));
  router.get('/api/migration', apiKeyAuth, adminAuth, (req, res) => migrationController.getAllJobs(req, res));
  router.get('/api/migration/active', apiKeyAuth, adminAuth, (req, res) => migrationController.getActiveJob(req, res));
  router.get('/api/migration/:id', apiKeyAuth, adminAuth, (req, res) => migrationController.getJob(req, res));
  router.delete('/api/migration/:id', apiKeyAuth, adminAuth, (req, res) => migrationController.cancelJob(req, res));

  // Kakao skill webhook
  router.post('/kakao/skill', apiKeyAuth, (req, res) => kakaoController.handleSkill(req, res));

  return router;
}
