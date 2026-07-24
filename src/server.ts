import 'reflect-metadata';
import { configureContainer, disconnectDatabase } from './config/container.js';
import { config, isTest } from './config/environment.js';
import { createApp } from './app.js';

async function bootstrap(): Promise<void> {
  // Configure DI container
  configureContainer();

  // Create Express app
  const app = createApp();

  // Start server (skip in test mode)
  if (!isTest) {
    app.listen(config.port, () => {
      console.log(`서버 시작: http://localhost:${config.port}`);
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
