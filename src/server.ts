import 'reflect-metadata';
import cron from 'node-cron';
import { configureContainer, container, disconnectDatabase } from './config/container.js';
import { config, isTest } from './config/environment.js';
import { createApp } from './app.js';
import { SyncRoutesUseCase } from './application/use-cases/SyncRoutesUseCase.js';

async function bootstrap(): Promise<void> {
  // Configure DI container
  configureContainer();

  // Create Express app
  const app = createApp();

  // Start server (skip in test mode)
  if (!isTest) {
    app.listen(config.port, () => {
      console.log(`서버 시작: http://localhost:${config.port}`);
      console.log(`카카오톡 스킬 URL: POST /kakao/skill`);
    });

    // Initial sync
    try {
      const syncUseCase = container.resolve(SyncRoutesUseCase);
      await syncUseCase.execute();
    } catch (error) {
      console.error('초기 동기화 실패:', error);
    }

    // Schedule sync: 6 AM and 2 PM, Monday to Saturday
    cron.schedule('0 6,14 * * 1-6', async () => {
      try {
        const syncUseCase = container.resolve(SyncRoutesUseCase);
        await syncUseCase.execute();
      } catch (error) {
        console.error('예약 동기화 실패:', error);
      }
    });
  }

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    console.log('\n서버 종료 중...');
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
  console.error('서버 시작 실패:', error);
  process.exit(1);
});
