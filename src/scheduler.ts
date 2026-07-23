import 'reflect-metadata';
import { SyncRoutesUseCase } from './application/use-cases/SyncRoutesUseCase.js';
import { configureContainer, container, disconnectDatabase } from './config/container.js';
import { scheduleRouteSync } from './scheduling/scheduleRouteSync.js';

configureContainer();
const syncUseCase = container.resolve(SyncRoutesUseCase);

async function sync(label: string): Promise<void> {
  try {
    await syncUseCase.execute();
  } catch (error) {
    console.error(`${label} 동기화 실패:`, error);
  }
}

await sync('초기');
scheduleRouteSync(() => sync('예약'));
console.log('수집 스케줄러 시작: 월~토 06:00~20:00 Asia/Seoul');

async function shutdown(): Promise<void> {
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);