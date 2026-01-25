import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const app = createApp();
const prisma = new PrismaClient();

describe('Auth Endpoints', () => {
  const testEmail = 'test@example.com';
  const testPassword = 'test-password-123';
  let testAdminId: number;

  beforeAll(async () => {
    await prisma.admin.deleteMany({ where: { email: testEmail } });
    
    const passwordHash = await bcrypt.hash(testPassword, 12);
    const admin = await prisma.admin.create({
      data: {
        email: testEmail,
        passwordHash,
        name: 'Test Admin',
      },
    });
    testAdminId = admin.id;
  });

  describe('POST /api/auth/login', () => {
    it('유효한 자격증명으로 로그인 성공', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.admin.email).toBe(testEmail);
    });

    it('잘못된 비밀번호로 로그인 실패', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'wrong-password' });
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('존재하지 않는 이메일로 로그인 실패', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: testPassword });
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('이메일/비밀번호 없이 요청 시 400 에러', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('유효한 토큰으로 사용자 정보 조회', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword });
      
      const token = loginRes.body.token;
      
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.admin.email).toBe(testEmail);
    });

    it('토큰 없이 요청 시 401 에러', async () => {
      const res = await request(app).get('/api/auth/me');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('잘못된 토큰으로 요청 시 401 에러', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Migration API with adminAuth', () => {
    it('토큰 없이 마이그레이션 API 접근 시 401 에러', async () => {
      const res = await request(app).get('/api/migration');
      
      expect(res.status).toBe(401);
    });

    it('유효한 토큰으로 마이그레이션 API 접근', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword });
      
      const token = loginRes.body.token;
      
      const res = await request(app)
        .get('/api/migration')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
    });
  });
});
