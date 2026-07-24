// 테스트 환경 설정
import 'reflect-metadata';

// 환경 변수 설정 (container import 전에 설정)
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'file:./logistics.db';
process.env.API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret';

import { afterAll } from 'vitest';

const { configureContainer, disconnectDatabase } = await import('../src/config/container.js');

// 컨테이너 즉시 설정
configureContainer();

afterAll(async () => {
  await disconnectDatabase();
});
