import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

// 카카오톡 스킬 요청 헬퍼
function kakaoRequest(utterance) {
  return request(app)
    .post('/kakao/skill')
    .send({
      userRequest: { utterance }
    });
}

describe('카카오톡 스킬', () => {
  describe('도움말', () => {
    it('"도움말" 입력 시 도움말 응답', async () => {
      const res = await kakaoRequest('도움말');
      expect(res.status).toBe(200);
      expect(res.body.version).toBe('2.0');
      expect(res.body.template.outputs[0].simpleText.text).toContain('물류 조회 도움말');
    });

    it('"?" 입력 시 도움말 응답', async () => {
      const res = await kakaoRequest('?');
      expect(res.status).toBe(200);
      expect(res.body.template.outputs[0].simpleText.text).toContain('도움말');
    });

    it('"메뉴" 입력 시 도움말 응답', async () => {
      const res = await kakaoRequest('메뉴');
      expect(res.status).toBe(200);
      expect(res.body.template.outputs[0].simpleText.text).toContain('도움말');
    });
  });

  describe('노선코드 검색', () => {
    it('"노선 101102" 입력', async () => {
      const res = await kakaoRequest('노선 101102');
      expect(res.status).toBe(200);
      expect(res.body.version).toBe('2.0');
    });

    it('"노선코드 101102" 입력', async () => {
      const res = await kakaoRequest('노선코드 101102');
      expect(res.status).toBe(200);
    });
  });

  describe('차량번호 검색', () => {
    it('"차량 4536" 입력', async () => {
      const res = await kakaoRequest('차량 4536');
      expect(res.status).toBe(200);
      expect(res.body.version).toBe('2.0');
    });

    it('"차량번호 충북80아4536" 입력', async () => {
      const res = await kakaoRequest('차량번호 충북80아4536');
      expect(res.status).toBe(200);
    });
  });

  describe('노선명/도착지 검색', () => {
    it('"도착 연희동" 입력', async () => {
      const res = await kakaoRequest('도착 연희동');
      expect(res.status).toBe(200);
      expect(res.body.version).toBe('2.0');
    });

    it('"노선명 마포" 입력', async () => {
      const res = await kakaoRequest('노선명 마포');
      expect(res.status).toBe(200);
    });
  });

  describe('현황 조회', () => {
    it('"오늘 현황" 입력', async () => {
      const res = await kakaoRequest('오늘 현황');
      expect(res.status).toBe(200);
      expect(res.body.version).toBe('2.0');
    });

    it('"어제 현황" 입력', async () => {
      const res = await kakaoRequest('어제 현황');
      expect(res.status).toBe(200);
    });
  });

  describe('숫자만 입력', () => {
    it('"101102" 입력 시 노선코드로 검색', async () => {
      const res = await kakaoRequest('101102');
      expect(res.status).toBe(200);
      expect(res.body.version).toBe('2.0');
    });
  });

  describe('알 수 없는 명령', () => {
    it('인식 불가 메시지 응답', async () => {
      const res = await kakaoRequest('asdfasdf');
      expect(res.status).toBe(200);
      expect(res.body.template.outputs[0].simpleText.text).toContain('이해하지 못했습니다');
    });
  });
});
