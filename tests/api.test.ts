import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('API Endpoints', () => {
  describe('GET /health', () => {
    it('헬스체크 응답 확인', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/routes/code/:code', () => {
    it('노선코드 검색', async () => {
      const res = await request(app).get('/api/routes/code/101102');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('존재하지 않는 노선코드', async () => {
      const res = await request(app).get('/api/routes/code/000000');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/routes/name/:name', () => {
    it('노선명 검색', async () => {
      const res = await request(app).get('/api/routes/name/부곡');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/routes/car/:number', () => {
    it('차량번호 검색', async () => {
      const res = await request(app).get('/api/routes/car/4536');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/routes/date/:date', () => {
    it('날짜별 검색', async () => {
      const res = await request(app).get('/api/routes/date/20251219');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/stats/:date', () => {
    it('통계 조회', async () => {
      const res = await request(app).get('/api/stats/20251219');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalRoutes');
    });
  });
});
