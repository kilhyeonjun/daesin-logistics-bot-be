import 'reflect-metadata';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import iconv from 'iconv-lite';
import { PrismaClient } from '@prisma/client';
import { CheerioHttpCrawler } from '../dist/infrastructure/crawling/CheerioHttpCrawler.js';
import { PrismaRouteRepository } from '../dist/infrastructure/persistence/PrismaRouteRepository.js';
import { SyncRoutesUseCase } from '../dist/application/use-cases/SyncRoutesUseCase.js';
import { SearchRoutesByCodeUseCase } from '../dist/application/use-cases/SearchRoutesByCodeUseCase.js';
import { CrawlingError } from '../dist/shared/errors/DomainError.js';

// This command never accepts an operational database or upstream URL.
const started = performance.now();
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const directory = await mkdtemp(join(tmpdir(), 'daesin-quality-'));
const databaseUrl = `file:${join(directory, 'quality.sqlite')}`;
const date = '20990102';
const sourceUrl = 'http://logistics.ds3211.co.kr/daesin/servlet/total.TotServlet';
const observations = [];
const requests = [];
let response = { status: 200, date, rows: [] };
const first = { code: '900001', count: '1,234', quantity: '2,345' };
const second = { code: '900002', count: '7', quantity: '9' };

function sourceHtml(rows) {
  const body = rows.map(row => `<tr>${[
    row.code, '합성출발→합성도착', 'SYNTHETIC', '합성차량', '', '',
    row.count, row.quantity, '3,000.5', '4,000.75',
  ].map(value => `<td>${value}</td>`).join('')}</tr>`).join('');
  return `<html><meta charset="euc-kr"><table class="tab1"><tr><th>노선코드</th></tr>${body}</table></html>`;
}

const server = createServer(async (request, reply) => {
  let body = '';
  for await (const chunk of request) body += chunk;
  const requestedDate = new URLSearchParams(body).get('fdate');
  requests.push({ date: requestedDate, status: response.status });
  if (request.method !== 'POST' || requestedDate !== response.date) {
    reply.writeHead(400); reply.end('Unexpected synthetic request'); return;
  }
  reply.writeHead(response.status, { 'content-type': 'text/html; charset=euc-kr' });
  reply.end(response.status === 200 ? iconv.encode(sourceHtml(response.rows), 'euc-kr') : 'Synthetic upstream failure');
});
const originalAdapter = axios.defaults.adapter;
let writer, reader;
try {
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'db', 'push', '--schema', join(root, 'prisma/schema.prisma'), '--skip-generate'], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: databaseUrl, CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1' },
    stdio: 'pipe',
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const fixtureUrl = `http://127.0.0.1:${server.address().port}/source`;
  const httpAdapter = axios.getAdapter('http');
  // Route only the real crawler's known source request into an actual loopback HTTP server.
  axios.defaults.adapter = config => {
    assert.equal(config.url, sourceUrl);
    assert.equal(config.method, 'post');
    return httpAdapter({ ...config, url: fixtureUrl, baseURL: undefined, proxy: false, maxRedirects: 0 });
  };
  writer = new PrismaClient({ datasourceUrl: databaseUrl });
  reader = new PrismaClient({ datasourceUrl: databaseUrl });
  const writerRepository = new PrismaRouteRepository(writer);
  const readerRepository = new PrismaRouteRepository(reader);
  const sync = new SyncRoutesUseCase(new CheerioHttpCrawler(), writerRepository);
  const search = new SearchRoutesByCodeUseCase(readerRepository);
  const currentRows = () => readerRepository.findByDate(date);

  assert.deepEqual(await sync.execute(date), { success: true, count: 0, date });
  assert.deepEqual(await search.execute('900'), []);
  observations.push({ scenario: 'not-yet-published', storedCodes: [] });

  response.rows = [first];
  assert.equal((await sync.execute(date)).count, 1);
  const [initial] = await search.execute('900001');
  assert.equal(initial.count, 1234);
  assert.equal(initial.quantity, 2345);
  assert.equal(initial.lineName, '합성출발→합성도착');
  assert.equal(initial.sectionFare, 3000.5);
  assert.equal(initial.totalFare, 4000.75);
  const createdAt = (await currentRows())[0].createdAt;
  observations.push({ scenario: 'single-row-publication', code: initial.lineCode, count: initial.count, quantity: initial.quantity });

  response.rows = [first, first];
  for (let replay = 0; replay < 2; replay++) {
    assert.equal((await sync.execute(date)).count, 2);
    const rows = await currentRows();
    assert.deepEqual(rows.map(row => row.lineCode), ['900001']);
    assert.equal(rows[0].createdAt, createdAt);
  }
  observations.push({ scenario: 'duplicate-replay', rowsPerResponse: 2, replays: 2, storedCodes: ['900001'], createdAtPreserved: true });

  response.rows = [{ ...first, count: '1,250', quantity: '2,400' }, second];
  await sync.execute(date);
  assert.equal((await search.execute('900001'))[0].count, 1250);
  assert.equal((await search.execute('900001'))[0].quantity, 2400);
  assert.deepEqual((await search.execute('900')).map(row => row.lineCode).sort(), ['900001', '900002']);
  observations.push({ scenario: 'delayed-addition-and-correction', storedCodes: ['900001', '900002'], readerCount: 1250 });

  response.rows = [{ ...second, count: '8' }];
  await sync.execute(date);
  assert.deepEqual((await currentRows()).map(row => row.lineCode), ['900001', '900002']);
  assert.equal((await search.execute('900001'))[0].count, 1250);
  assert.equal((await search.execute('900002'))[0].count, 8);
  observations.push({ scenario: 'source-omission-retains-prior-row', omittedCode: '900001', storedCodes: ['900001', '900002'], authoritativeSnapshot: false });

  const beforeFailure = await currentRows();
  const requestCount = requests.length;
  response.status = 503;
  await assert.rejects(() => sync.execute(date), CrawlingError);
  assert.equal(requests.length, requestCount + 1);
  assert.deepEqual(await currentRows(), beforeFailure);
  observations.push({ scenario: 'failed-fetch-preserves-state', status: 503, attempts: 1, storedCodes: ['900001', '900002'] });

  response = { status: 200, date, rows: [{ ...first, count: '1,260' }, { ...second, count: '9' }] };
  await sync.execute(date);
  assert.equal((await search.execute('900001'))[0].count, 1260);
  assert.equal((await search.execute('900002'))[0].count, 9);
  assert.equal((await currentRows())[0].createdAt, createdAt);
  observations.push({ scenario: 'later-explicit-run-recovers', readerCount: 1260, createdAtPreserved: true, automaticRetry: false });

  response = { status: 200, date: '20990101', rows: [{ ...first, count: '5' }] };
  await sync.execute(response.date);
  assert.deepEqual((await search.execute('900001')).map(row => [row.searchDate, row.count]), [[date, 1260], [response.date, 5]]);
  response.rows = [{ ...first, count: '6' }];
  await sync.execute(response.date);
  assert.deepEqual((await search.execute('900001')).map(row => [row.searchDate, row.count]), [[date, 1260], [response.date, 6]]);
  observations.push({ scenario: 'historical-correction-visible', code: '900001', dates: [date, response.date], historicalCount: 6 });

  const beforeWriteFailure = await reader.route.findMany({ orderBy: { id: 'asc' } });
  const third = { code: '900003', count: '11', quantity: '12' };
  const rejected = { code: '900004', count: '13', quantity: '14' };
  response = { status: 200, date, rows: [{ ...first, count: '9,999' }, third, rejected] };
  // Fail the third write after an update and an insertion, only in this owned database.
  await writer.$executeRawUnsafe(`CREATE TRIGGER synthetic_reject_route
    BEFORE INSERT ON routes WHEN NEW.line_code = '900004'
    BEGIN SELECT RAISE(ABORT, 'synthetic persistence failure'); END`);
  const beforeWriteRequests = requests.length;
  let writeFailureCode;
  await assert.rejects(() => sync.execute(date), error => {
    assert.equal(error.name, 'PrismaClientKnownRequestError');
    assert.match(error.message, /constraint|synthetic persistence failure/i);
    writeFailureCode = error.code;
    return true;
  });
  assert.equal(requests.length, beforeWriteRequests + 1);
  assert.deepEqual(await reader.route.findMany({ orderBy: { id: 'asc' } }), beforeWriteFailure);
  assert.equal((await search.execute('900001'))[0].count, 1260);
  assert.deepEqual(await search.execute('900003'), []);
  assert.deepEqual(await search.execute('900004'), []);
  observations.push({
    scenario: 'mid-batch-write-failure-rolls-back', attemptedOperations: ['update', 'insert', 'rejected-insert'],
    attempts: 1, writeFailureCode, priorRowsAndTimestampsPreserved: true, partialInsertVisible: false,
  });

  await writer.$executeRawUnsafe('DROP TRIGGER synthetic_reject_route');
  assert.deepEqual(await sync.execute(date), { success: true, count: 3, date });
  assert.deepEqual((await search.execute('900')).filter(row => row.searchDate === date)
    .map(row => [row.lineCode, row.count]).sort(), [
    ['900001', 9999], ['900002', 9], ['900003', 11], ['900004', 13],
  ]);
  const afterReplay = await reader.route.findMany({ orderBy: { id: 'asc' } });
  for (const prior of beforeWriteFailure) {
    const expected = prior.searchDate === date && prior.lineCode === '900001' ? { ...prior, count: 9999 } : prior;
    assert.deepEqual(afterReplay.find(row => row.id === prior.id), expected);
  }
  observations.push({
    scenario: 'explicit-replay-after-write-failure', committedOperations: 3,
    storedCodes: ['900001', '900002', '900003', '900004'], readerCount: 9999,
    priorIdsAndTimestampsPreserved: true, historicalRowsPreserved: true, automaticRetry: false,
  });

  console.log(JSON.stringify({
    verification: 'daesin-ingestion-quality', synthetic: true,
    transport: 'loopback HTTP with EUC-KR responses', storage: 'owned temporary SQLite',
    readerWriterConnections: 2, realUpstreamRequests: 0, fixtureRequests: requests.length,
    observations,
    limits: [
      'Synthetic fixtures do not prove live source completeness or a production freshness SLA.',
      'Upsert-only storage retains omitted rows; createdAt is first insertion, not last successful collection.',
      'Code search reads SQLite on every request; database load and production latency are not measured here.',
      'No scheduler, operational database, or production deployment was changed by this command.',
    ],
    elapsedMs: Math.round(performance.now() - started),
  }, null, 2));
} finally {
  axios.defaults.adapter = originalAdapter;
  await Promise.all([writer?.$disconnect(), reader?.$disconnect()]);
  if (server.listening) await new Promise(resolve => server.close(resolve));
  await rm(directory, { recursive: true, force: true });
}
