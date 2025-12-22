import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import { syncAllRoutes } from './crawler.js';

// 라우터
import apiRoutes from './routes/api.routes.js';
import kakaoRoutes from './routes/kakao.routes.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 라우터 등록
app.use(apiRoutes);
app.use(kakaoRoutes);

// 스케줄러: 매일 오전 6시, 오후 2시에 동기화
cron.schedule('0 6,14 * * 1-6', async () => {
  console.log('[스케줄러] 자동 동기화 시작');
  try {
    await syncAllRoutes();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[스케줄러] 동기화 실패:', message);
  }
});

// 서버 시작 (테스트 환경 제외)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`서버 시작: http://localhost:${PORT}`);
    console.log('카카오톡 스킬 URL: POST /kakao/skill');

    // 시작 시 한 번 동기화
    syncAllRoutes().catch(err => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('초기 동기화 실패:', message);
    });
  });
}

export default app;
