require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const db = require('./database');
const { syncAllRoutes, getDefaultSearchDate } = require('./crawler');
const kakao = require('./kakao');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ============== API 엔드포인트 ==============

// 헬스체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 수동 동기화
app.post('/api/sync', async (req, res) => {
  try {
    const date = req.body.date || getDefaultSearchDate();
    const routes = await syncAllRoutes(date);
    res.json({ success: true, count: routes.length, date });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 노선코드로 검색
app.get('/api/routes/code/:code', (req, res) => {
  const routes = db.searchByLineCode(req.params.code);
  res.json(routes);
});

// 노선명으로 검색
app.get('/api/routes/name/:name', (req, res) => {
  const routes = db.searchByLineName(req.params.name);
  res.json(routes);
});

// 차량번호로 검색
app.get('/api/routes/car/:number', (req, res) => {
  const routes = db.searchByCarNumber(req.params.number);
  res.json(routes);
});

// 날짜별 검색
app.get('/api/routes/date/:date', (req, res) => {
  const routes = db.searchByDate(req.params.date);
  res.json(routes);
});

// 날짜별 통계
app.get('/api/stats/:date', (req, res) => {
  const stats = db.getStatsByDate(req.params.date);
  res.json(stats);
});

// ============== 카카오톡 챗봇 스킬 ==============

app.post('/kakao/skill', async (req, res) => {
  try {
    const { action, userRequest } = req.body;
    const utterance = userRequest?.utterance?.trim() || '';

    console.log(`[카카오] 발화: "${utterance}"`);

    // 명령어 파싱
    let response;

    if (utterance.includes('도움말') || utterance === '?' || utterance === '메뉴') {
      response = kakao.helpMessage();
    }
    // 노선코드 검색
    else if (utterance.startsWith('노선 ') || utterance.startsWith('노선코드 ')) {
      const code = utterance.replace(/^노선(코드)?\s*/, '');
      const routes = db.searchByLineCode(code);
      response = kakao.formatRouteMessage(routes);
    }
    // 차량번호 검색
    else if (utterance.startsWith('차량 ') || utterance.startsWith('차량번호 ')) {
      const number = utterance.replace(/^차량(번호)?\s*/, '');
      const routes = db.searchByCarNumber(number);
      response = kakao.formatRouteMessage(routes);
    }
    // 노선명/도착지 검색
    else if (utterance.startsWith('도착 ') || utterance.startsWith('노선명 ')) {
      const name = utterance.replace(/^(도착|노선명)\s*/, '');
      const routes = db.searchByLineName(name);
      response = kakao.formatRouteMessage(routes);
    }
    // 오늘 현황
    else if (utterance.includes('오늘') && utterance.includes('현황')) {
      const today = getDefaultSearchDate();
      const stats = db.getStatsByDate(today);
      response = kakao.formatStatsMessage(stats, today);
    }
    // 어제 현황
    else if (utterance.includes('어제') && utterance.includes('현황')) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const date = yesterday.toISOString().slice(0, 10).replace(/-/g, '');
      const stats = db.getStatsByDate(date);
      response = kakao.formatStatsMessage(stats, date);
    }
    // 숫자만 입력 (노선코드로 추정)
    else if (/^\d{4,6}$/.test(utterance)) {
      const routes = db.searchByLineCode(utterance);
      response = kakao.formatRouteMessage(routes);
    }
    // 기본 응답
    else {
      response = kakao.simpleText(
        `"${utterance}"를 이해하지 못했습니다.\n\n"도움말"을 입력하면 사용법을 볼 수 있습니다.`
      );
    }

    res.json(response);
  } catch (error) {
    console.error('[카카오] 에러:', error);
    res.json(kakao.simpleText('처리 중 오류가 발생했습니다.'));
  }
});

// ============== 스케줄러 ==============

// 매일 오전 6시, 오후 2시에 동기화
cron.schedule('0 6,14 * * 1-6', async () => {
  console.log('[스케줄러] 자동 동기화 시작');
  try {
    await syncAllRoutes();
  } catch (error) {
    console.error('[스케줄러] 동기화 실패:', error.message);
  }
});

// ============== 서버 시작 ==============

app.listen(PORT, () => {
  console.log(`서버 시작: http://localhost:${PORT}`);
  console.log('카카오톡 스킬 URL: POST /kakao/skill');

  // 시작 시 한 번 동기화
  syncAllRoutes().catch(err => {
    console.error('초기 동기화 실패:', err.message);
  });
});
