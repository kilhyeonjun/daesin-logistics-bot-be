const express = require('express');
const { handleUtterance } = require('../handlers/kakao.handler');
const kakao = require('../kakao');

const router = express.Router();

// 카카오톡 챗봇 스킬
router.post('/kakao/skill', async (req, res) => {
  try {
    const { userRequest } = req.body;
    const utterance = userRequest?.utterance?.trim() || '';

    console.log(`[카카오] 발화: "${utterance}"`);

    const response = handleUtterance(utterance);
    res.json(response);
  } catch (error) {
    console.error('[카카오] 에러:', error);
    res.json(kakao.simpleText('처리 중 오류가 발생했습니다.'));
  }
});

module.exports = router;
