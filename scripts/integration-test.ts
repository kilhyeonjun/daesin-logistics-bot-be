/**
 * 빌드 후 통합 테스트
 * - Node.js 네이티브 ESM 환경에서 앱 실행 검증
 * - CommonJS/ESM 호환성 문제 조기 발견
 */
import { spawn, ChildProcess } from 'child_process';
import http from 'http';

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

// HTTP 요청 헬퍼
function request(
  method: string,
  path: string,
  body?: object
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options: http.RequestOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 0, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// 서버 준비 대기
async function waitForServer(maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await request('GET', '/health');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('서버 시작 타임아웃');
}

// 테스트 실행 래퍼
async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error });
    console.log(`  ✗ ${name}: ${error}`);
  }
}

// 테스트 케이스들
async function runTests(): Promise<void> {
  console.log('\n테스트 실행 중...\n');

  await test('GET /health - 헬스체크', async () => {
    const res = await request('GET', '/health');
    if (res.status !== 200) throw new Error(`status: ${res.status}`);
    const body = res.body as { status: string };
    if (body.status !== 'ok') throw new Error(`body.status: ${body.status}`);
  });

  await test('POST /kakao/skill - 도움말', async () => {
    const res = await request('POST', '/kakao/skill', {
      userRequest: { utterance: '도움말' },
    });
    if (res.status !== 200) throw new Error(`status: ${res.status}`);
    const body = res.body as { version: string; template: { outputs: Array<{ simpleText?: { text: string } }> } };
    if (body.version !== '2.0') throw new Error(`version: ${body.version}`);
    if (!body.template.outputs[0].simpleText?.text.includes('도움말')) {
      throw new Error('도움말 텍스트 미포함');
    }
  });

  await test('POST /kakao/skill - 노선 검색', async () => {
    const res = await request('POST', '/kakao/skill', {
      userRequest: { utterance: '노선 101102' },
    });
    if (res.status !== 200) throw new Error(`status: ${res.status}`);
    const body = res.body as { version: string };
    if (body.version !== '2.0') throw new Error(`version: ${body.version}`);
  });

  await test('GET /api/routes/code/101102 - API 검색', async () => {
    const res = await request('GET', '/api/routes/code/101102');
    if (res.status !== 200) throw new Error(`status: ${res.status}`);
    if (!Array.isArray(res.body)) throw new Error('응답이 배열이 아님');
  });
}

// 메인 함수
async function main(): Promise<void> {
  console.log('=== 빌드 후 통합 테스트 ===\n');

  // 서버 시작
  // 참고: NODE_ENV=test이면 서버가 시작되지 않으므로 integration 사용
  console.log('서버 시작 중...');
  const server: ChildProcess = spawn('node', ['dist/app.js'], {
    env: { ...process.env, NODE_ENV: 'integration', PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // 서버 출력 모니터링 (오류 감지용)
  let serverError = '';
  server.stderr?.on('data', (data) => {
    serverError += data.toString();
  });

  // 서버 시작 실패 감지
  const serverExited = new Promise<void>((_, reject) => {
    server.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`서버 비정상 종료 (code: ${code})\n${serverError}`));
      }
    });
  });

  try {
    // 서버 준비 대기 (타임아웃 또는 서버 오류 시 실패)
    // 참고: 서버 시작 시 크롤링이 실행되어 시간이 걸릴 수 있음
    await Promise.race([
      waitForServer(100), // 10초 대기 (100 * 100ms)
      serverExited,
      new Promise((_, reject) => setTimeout(() => reject(new Error('서버 시작 타임아웃 (10초)')), 10000)),
    ]);

    console.log('서버 준비 완료\n');

    // 테스트 실행
    await runTests();
  } finally {
    // 서버 종료
    server.kill();
  }

  // 결과 요약
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n=== 결과 ===');
  console.log(`통과: ${passed}, 실패: ${failed}`);

  if (failed > 0) {
    console.log('\n실패한 테스트:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }

  console.log('\n✓ 모든 통합 테스트 통과');
}

main().catch((err) => {
  console.error('\n✗ 통합 테스트 실패:', err.message);
  process.exit(1);
});
