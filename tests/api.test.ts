import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

function apiGet(path: string) {
  return request(app).get(path).set('x-api-key', process.env.API_KEY ?? '');
}

describe('API Endpoints', () => {
  describe('GET /health', () => {
    it('헬스체크 응답 확인', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('CORS', () => {
    it('공개 프론트엔드 origin만 허용한다', async () => {
      const allowed = await request(app)
        .options('/api/routes/code/101102')
        .set('Origin', 'https://daesin.kilpenguin.com')
        .set('Access-Control-Request-Method', 'GET');
      const untrusted = await request(app)
        .options('/api/routes/code/101102')
        .set('Origin', 'https://untrusted-preview.vercel.app')
        .set('Access-Control-Request-Method', 'GET');

      expect(allowed.headers['access-control-allow-origin']).toBe('https://daesin.kilpenguin.com');
      expect(untrusted.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('POST /kakao/skill', () => {
    it('제거된 챗봇 공개 엔드포인트를 노출하지 않는다', async () => {
      const res = await request(app)
        .post('/kakao/skill')
        .set('x-api-key', process.env.API_KEY ?? '')
        .send({ userRequest: { utterance: '도움말' } });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/routes/code/:code', () => {
    it('노선코드 검색', async () => {
      const res = await apiGet('/api/routes/code/101102');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('존재하지 않는 노선코드', async () => {
      const res = await apiGet('/api/routes/code/000000');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/routes/name/:name', () => {
    it('노선명 검색', async () => {
      const res = await apiGet('/api/routes/name/부곡');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/routes/car/:number', () => {
    it('차량번호 검색', async () => {
      const res = await apiGet('/api/routes/car/4536');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/routes/date/:date', () => {
    it('날짜별 검색', async () => {
      const res = await apiGet('/api/routes/date/20251219');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/stats/:date', () => {
    it('통계 조회', async () => {
      const res = await apiGet('/api/stats/20251219');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalRoutes');
    });
  });
});
