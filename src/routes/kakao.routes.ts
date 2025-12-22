import { Router, Request, Response } from 'express';
import { handleUtterance } from '../handlers/kakao.handler.js';
import { simpleText } from '../kakao.js';
import type { KakaoSkillRequest } from '../types/kakao.js';

const router = Router();

// 카카오톡 챗봇 스킬
router.post('/kakao/skill', (req: Request, res: Response) => {
  try {
    const body = req.body as KakaoSkillRequest;
    const utterance = body.userRequest?.utterance?.trim() || '';

    console.log(`[카카오] 발화: "${utterance}"`);

    const response = handleUtterance(utterance);
    res.json(response);
  } catch (error) {
    console.error('[카카오] 에러:', error);
    res.json(simpleText('처리 중 오류가 발생했습니다.'));
  }
});

export default router;
