import 'reflect-metadata';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir, cpus, platform, release, arch } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import iconv from 'iconv-lite';
import { Prisma, PrismaClient } from '@prisma/client';
import { CheerioHttpCrawler } from '../dist/infrastructure/crawling/CheerioHttpCrawler.js';
import { PrismaRouteRepository } from '../dist/infrastructure/persistence/PrismaRouteRepository.js';
import { SyncRoutesUseCase } from '../dist/application/use-cases/SyncRoutesUseCase.js';
import { SearchRoutesByCodeUseCase } from '../dist/application/use-cases/SearchRoutesByCodeUseCase.js';
import { CrawlingError } from '../dist/shared/errors/DomainError.js';

// This command never accepts an operational database or upstream URL.
const benchmarkEnabled = process.argv.slice(2).includes('--benchmark');
assert.ok(process.argv.slice(2).every(argument => argument === '--benchmark'), 'Only --benchmark is accepted; no DB or URL inputs');
const startedAt = new Date().toISOString();
const started = performance.now();
const benchmarkConfig = { sizes: [100, 1000], warmupRunsPerSize: 1, measuredRunsPerSize: 3, contentionWarmupRuns: 1, contentionMeasuredRuns: 3, lockHoldTargetMs: 150, readerPauseMs: 1, maxReaderSamplesPerRun: 1000 };
// Pinned Quaint source parses socket_timeout as seconds and applies SQLite busy_timeout.
// This separate client's shorter budget does not alter the original writer or short-contention runs.
const recoveryConfig = { measuredRuns: 3, fixtureSocketTimeoutSeconds: 1, fixtureConnectionLimit: 1, rejectionDeadlineMs: 3000, holderTransactionTimeoutMs: 5000 };
const sqliteEngineSource = `https://github.com/prisma/prisma-engines/blob/${Prisma.prismaVersion.engine}/quaint/src/connector/sqlite/`;
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
// Nearest-rank percentiles, no interpolation; with three measured runs p95 is the maximum.
function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = fraction => sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
  return { sampleCount: sorted.length, minMs: sorted[0] ?? null, p50Ms: percentile(0.5) ?? null, p95Ms: percentile(0.95) ?? null, maxMs: sorted.at(-1) ?? null };
}
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
let writer, reader, locker, recoveryWriter;
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

  let benchmark;
  if (benchmarkEnabled) {
    const measuredAt = new Date().toISOString();
    const measurementStart = performance.now();
    const load = [], contention = [];
    let runNumber = 0;
    for (const size of benchmarkConfig.sizes) {
      for (let run = 0; run < benchmarkConfig.warmupRunsPerSize + benchmarkConfig.measuredRunsPerSize; run++) {
        const phase = run < benchmarkConfig.warmupRunsPerSize ? 'warmup' : 'measured';
        const sampleDate = `209902${String(++runNumber).padStart(2, '0')}`;
        const rows = Array.from({ length: size }, (_, index) => ({ code: String(100000 + index), count: String(index + 1), quantity: String(index + 2) }));
        response = { status: 200, date: sampleDate, rows };
        assert.deepEqual(await readerRepository.findByDate(sampleDate), []);
        const probes = [];
        const requestStart = requests.length;
        let settled = false, ingestionMs;
        const sampleStart = performance.now();
        const ingestion = sync.execute(sampleDate).then(result => ({ result }), error => ({ error })).finally(() => { ingestionMs = performance.now() - sampleStart; settled = true; });
        let readerFailure;
        try {
          do {
            const probeStart = performance.now();
            const pendingAtStart = !settled;
            const snapshot = await readerRepository.findByDate(sampleDate);
            const snapshotMs = performance.now() - probeStart;
            // Each independent SELECT must see the entire transaction or none of it.
            assert.ok(snapshot.length === 0 || snapshot.length === size);
            for (const [index, row] of snapshot.entries()) {
              assert.equal(row.lineCode, rows[index].code);
              assert.equal(row.count, index + 1);
              assert.equal(row.quantity, index + 2);
            }
            const searchStart = performance.now();
            const found = (await search.execute(rows[0].code)).filter(row => row.searchDate === sampleDate);
            const searchMs = performance.now() - searchStart;
            assert.ok(found.length === 0 || (found.length === 1 && found[0].count === 1));
            probes.push({ offsetMs: probeStart - sampleStart, pendingAtStart, snapshotMs, searchMs, visibleRows: snapshot.length, searchVisibleRows: found.length });
            if (!settled) await pause(benchmarkConfig.readerPauseMs);
          } while (!settled && probes.length < benchmarkConfig.maxReaderSamplesPerRun);
        } catch (error) { readerFailure = error; }
        const outcome = await ingestion;
        if (readerFailure) throw readerFailure;
        if (outcome.error) throw outcome.error;
        assert.deepEqual(outcome.result, { success: true, count: size, date: sampleDate });
        assert.equal(requests.length, requestStart + 1);
        const finalRows = await readerRepository.findByDate(sampleDate);
        assert.equal(finalRows.length, size);
        for (const [index, row] of finalRows.entries()) {
          assert.equal(row.lineCode, rows[index].code);
          assert.equal(row.count, index + 1);
          assert.equal(row.quantity, index + 2);
        }
        load.push({ phase, size, run: run + 1, ingestionMs, fixtureRequests: requests.length - requestStart, independentReadback: 'complete-deterministic-records', probes });
      }
    }

    locker = new PrismaClient({ datasourceUrl: databaseUrl });
    await locker.$connect();
    for (let run = 0; run < benchmarkConfig.contentionWarmupRuns + benchmarkConfig.contentionMeasuredRuns; run++) {
      const phase = run < benchmarkConfig.contentionWarmupRuns ? 'warmup' : 'measured';
      const before = await reader.route.findMany({ orderBy: { id: 'asc' } });
      const old = before.find(row => row.searchDate === date && row.lineCode === first.code);
      const correctedCount = 20000 + run;
      const added = { code: String(910000 + run), count: '17', quantity: '18' };
      response = { status: 200, date, rows: [{ ...first, count: String(correctedCount) }, added] };
      const acquired = deferred(), releaseLock = deferred();
      let acquiredAt, releaseRequestedAt, releasedAt;
      // A third PrismaClient owns a real SQLite write transaction. The UPDATE must finish
      // before the contender starts; a no-op value change still acquires the writer lock.
      const holding = locker.$transaction(async transaction => {
        assert.equal(await transaction.$executeRawUnsafe("UPDATE routes SET count = count WHERE search_date = '20990102' AND line_code = '900001'"), 1);
        acquiredAt = performance.now();
        acquired.resolve();
        await releaseLock.promise;
      }).then(() => { releasedAt = performance.now(); }, error => { acquired.reject(error); throw error; });
      // Observe early transaction errors immediately, then propagate at the awaited boundary.
      holding.catch(() => {});
      let contender, contenderStart, contenderSettledAt, lockRead;
      const requestStart = requests.length;
      try {
        await acquired.promise;
        contenderStart = performance.now();
        contender = sync.execute(date).then(result => ({ result }), error => ({ error })).finally(() => { contenderSettledAt = performance.now(); });
        const readStart = performance.now();
        const readDuringLock = (await search.execute(first.code)).find(row => row.searchDate === date);
        lockRead = { latencyMs: performance.now() - readStart, count: readDuringLock.count };
        assert.equal(readDuringLock.count, old.count);
        // Target is measured from lock acquisition, not from the completion of the reader.
        await pause(Math.max(0, benchmarkConfig.lockHoldTargetMs - (performance.now() - acquiredAt)));
      } finally {
        releaseRequestedAt = performance.now();
        releaseLock.resolve();
        try { await holding; } finally { if (contender) await contender; }
      }
      const outcome = await contender;
      assert.equal(requests.length, requestStart + 1);
      const afterAttempt = await reader.route.findMany({ orderBy: { id: 'asc' } });
      let replay = null;
      if (outcome.error) {
        assert.deepEqual(afterAttempt, before);
        const replayStart = performance.now();
        assert.deepEqual(await sync.execute(date), { success: true, count: 2, date });
        replay = { explicit: true, elapsedMs: performance.now() - replayStart, outcome: 'success' };
        assert.equal(requests.length, requestStart + 2);
      } else {
        assert.deepEqual(outcome.result, { success: true, count: 2, date });
      }
      const committed = await reader.route.findMany({ orderBy: { id: 'asc' } });
      assert.equal(committed.length, before.length + 1);
      for (const prior of before) {
        const expected = prior.id === old.id ? { ...prior, count: correctedCount, quantity: 2345 } : prior;
        assert.deepEqual(committed.find(row => row.id === prior.id), expected);
      }
      assert.equal(committed.find(row => row.lineCode === added.code).count, 17);
      contention.push({ phase, run: run + 1, lockAcquiredBeforeContender: acquiredAt <= contenderStart,
        lockHeldUntilReleaseRequestMs: releaseRequestedAt - acquiredAt, lockTransactionMs: releasedAt - acquiredAt,
        contenderOffsetFromLockMs: contenderStart - acquiredAt, contenderMs: contenderSettledAt - contenderStart,
        contenderSettledBeforeLockRelease: contenderSettledAt < releasedAt,
        outcome: outcome.error ? 'rejected' : 'success',
        error: outcome.error ? { name: outcome.error.name, code: outcome.error.code ?? null } : null,
        lockRead, replay, independentReadback: 'atomic-state-and-prior-ids-timestamps-preserved', automaticRetry: false });
    }
    // Run only after all original samples, leaving their clients and budgets unchanged.
    recoveryWriter = new PrismaClient({ datasourceUrl: `${databaseUrl}?socket_timeout=${recoveryConfig.fixtureSocketTimeoutSeconds}&connection_limit=${recoveryConfig.fixtureConnectionLimit}` });
    const recoverySync = new SyncRoutesUseCase(new CheerioHttpCrawler(), new PrismaRouteRepository(recoveryWriter));
    await recoveryWriter.$connect();
    const fixtureBusyTimeout = await recoveryWriter.$queryRawUnsafe('PRAGMA busy_timeout');
    assert.equal(Number(fixtureBusyTimeout[0].timeout), recoveryConfig.fixtureSocketTimeoutSeconds * 1000);
    const rejectionReplay = [];
    for (let run = 0; run < recoveryConfig.measuredRuns; run++) {
      const before = await reader.route.findMany({ orderBy: { id: 'asc' } });
      const old = before.find(row => row.searchDate === date && row.lineCode === first.code);
      const correctedCount = 30000 + run;
      const added = { code: String(920000 + run), count: '23', quantity: '24' };
      response = { status: 200, date, rows: [{ ...first, count: String(correctedCount) }, added] };
      const acquired = deferred(), releaseLock = deferred();
      let transaction, acquiredAt, releaseRequestedAt, releasedAt, contenderStart, contenderSettledAt, deadline;
      let preserved, rejection, lockOwnershipConfirmedAt;
      const holding = locker.$transaction(async tx => {
        transaction = tx;
        assert.equal(await tx.$executeRawUnsafe("UPDATE routes SET count = count WHERE search_date = '20990102' AND line_code = '900001'"), 1);
        acquiredAt = performance.now();
        acquired.resolve();
        await releaseLock.promise;
      }, { timeout: recoveryConfig.holderTransactionTimeoutMs }).then(() => { releasedAt = performance.now(); }, error => { acquired.reject(error); throw error; });
      holding.catch(() => {});
      let contender;
      const requestStart = requests.length;
      try {
        await acquired.promise;
        contenderStart = performance.now();
        contender = recoverySync.execute(date).then(result => ({ result }), error => ({ error })).finally(() => { contenderSettledAt = performance.now(); });
        // Deadline is a failing guard, never an accepted rejection or a lock-release policy.
        const outcome = await Promise.race([
          contender,
          new Promise(resolve => { deadline = setTimeout(() => resolve({ deadlineExceeded: true }), recoveryConfig.rejectionDeadlineMs); }),
        ]);
        clearTimeout(deadline);
        assert.ok(!outcome.deadlineExceeded, 'Real contender did not reject within the fixture guard; no rejection evidence established');
        assert.ok(outcome.error, 'A contender succeeding under the held writer lock is not rejection evidence');
        const error = outcome.error;
        assert.equal(error.name, 'PrismaClientKnownRequestError');
        assert.equal(error.code, 'P1008');
        assert.match(error.message, /timed?\s*out|timeout/i);
        rejection = { name: error.name, code: error.code, message: error.message, meta: error.meta ?? null, clientVersion: error.clientVersion ?? null };
        assert.equal(requests.length, requestStart + 1);
        const readStart = performance.now();
        const duringLock = await reader.route.findMany({ orderBy: { id: 'asc' } });
        assert.deepEqual(duringLock, before);
        assert.ok(!duringLock.some(row => row.lineCode === added.code));
        preserved = { readOffsetFromLockMs: readStart - acquiredAt, readMs: performance.now() - readStart,
          rows: duringLock.filter(row => row.searchDate === date), entireDatabaseExactlyUnchanged: true };
        // Reusing the original transaction proves it has not expired/rolled back while we read.
        assert.equal(await transaction.$executeRawUnsafe("UPDATE routes SET count = count WHERE search_date = '20990102' AND line_code = '900001'"), 1);
        lockOwnershipConfirmedAt = performance.now();
        assert.equal(requests.length, requestStart + 1, 'No automatic HTTP retry while rejection and preservation are observed');
      } finally {
        clearTimeout(deadline);
        releaseRequestedAt = performance.now();
        releaseLock.resolve();
        try { await holding; } finally { if (contender) await contender; }
      }
      assert.ok(acquiredAt <= contenderStart && contenderSettledAt <= lockOwnershipConfirmedAt && lockOwnershipConfirmedAt <= releaseRequestedAt);
      const afterRelease = await reader.route.findMany({ orderBy: { id: 'asc' } });
      assert.deepEqual(afterRelease, before);
      assert.equal(requests.length, requestStart + 1);
      const replayStart = performance.now();
      const result = await recoverySync.execute(date);
      const replayMs = performance.now() - replayStart;
      assert.deepEqual(result, { success: true, count: 2, date });
      assert.equal(requests.length, requestStart + 2);
      const committed = await reader.route.findMany({ orderBy: { id: 'asc' } });
      assert.equal(committed.length, before.length + 1);
      for (const prior of before) {
        const expected = prior.id === old.id ? { ...prior, count: correctedCount, quantity: 2345 } : prior;
        assert.deepEqual(committed.find(row => row.id === prior.id), expected);
      }
      const inserted = committed.find(row => row.searchDate === date && row.lineCode === added.code);
      assert.ok(inserted && !before.some(row => row.id === inserted.id));
      // Check every persisted insertion field against the existing fixture-shaped route.
      assert.deepEqual(inserted, { ...old, id: inserted.id, createdAt: inserted.createdAt,
        lineCode: added.code, count: 23, quantity: 24,
        raceInfoUrl: old.raceInfoUrl?.replace(first.code, added.code) ?? null,
        carDetailUrl: old.carDetailUrl?.replace(first.code, added.code) ?? null,
        waypointUrl: old.waypointUrl?.replace(first.code, added.code) ?? null });
      assert.ok(Number.isFinite(Date.parse(inserted.createdAt)));
      rejectionReplay.push({ run: run + 1, phase: 'measured', correctedCode: first.code, correctedCount, addedCode: added.code,
        priorRows: before.filter(row => row.searchDate === date),
        lockAcquiredBeforeContender: true, contenderOffsetFromLockMs: contenderStart - acquiredAt,
        contenderMs: contenderSettledAt - contenderStart, rejection,
        rejectedWhileLockHeld: true, preservationBeforeRelease: preserved,
        lockOwnershipConfirmedOffsetMs: lockOwnershipConfirmedAt - acquiredAt,
        release: { requestedOffsetMs: releaseRequestedAt - acquiredAt, completedOffsetMs: releasedAt - acquiredAt, priorStatePreserved: true },
        rejectedAttemptFixtureRequests: 1, automaticRetry: false,
        replay: { explicit: true, elapsedMs: replayMs, result, fixtureRequests: 1,
          rows: committed.filter(row => row.searchDate === date), priorIdsAndTimestampsPreserved: true, completeCorrectionAndAddition: true } });
    }
    const measuredLoad = load.filter(sample => sample.phase === 'measured');
    const measuredContention = contention.filter(sample => sample.phase === 'measured');
    benchmark = {
      synthetic: true, measuredAt, completedAt: new Date().toISOString(), intervalMs: performance.now() - measurementStart,
      configuration: benchmarkConfig,
      environment: { node: process.version, platform: platform(), osRelease: release(), arch: arch(), cpuModel: cpus()[0]?.model ?? 'unknown', logicalCpus: cpus().length, prismaClient: require('@prisma/client/package.json').version,
        sqlite: await reader.$queryRawUnsafe('SELECT sqlite_version() AS version'), journalMode: await reader.$queryRawUnsafe('PRAGMA journal_mode') },
      method: {
        ingestion: 'Wall-clock sync.execute: loopback HTTP + EUC-KR parsing + real repository transaction; concurrent reader work included, final readback excluded.',
        reader: 'Separate PrismaClient; sequential date-snapshot SELECT and real code-search use case, sampled while ingestion is pending. Separate SELECTs may see different committed states.',
        contention: 'Independent third PrismaClient obtains UPDATE writer lock before contender; hold target 150ms; no changed production timeout/retry/concurrency. Contender duration is end-to-end, not isolated SQLite wait.',
        percentile: 'Nearest rank: sorted[ceil(p*n)-1]; warmups excluded; per-size ingestion and pooled per-size reader samples. Three measured runs make p95 the maximum.',
        storage: 'Fresh owned DB per invocation, cumulative dates within invocation; no cache flush, process restart or production-scale inference.',
      },
      load, contention,
      rejectionReplay: { configuration: recoveryConfig,
        budgetScope: 'Only the fourth fixture client uses socket_timeout=1 and connection_limit=1; original load and 150ms contention clients retain their settings. Holder timeout is explicitly the existing Prisma 5000ms default, not increased.',
        fixtureBusyTimeoutMs: Number(fixtureBusyTimeout[0].timeout),
        source: { engineVersion: require('@prisma/client').Prisma.prismaVersion.engine,
          params: `${sqliteEngineSource}params.rs`, busyTimeoutAndBeginImmediate: `${sqliteEngineSource}native/mod.rs`, busyErrorMapping: `${sqliteEngineSource}error.rs` },
        method: 'Three required real P1008 timeout rejections under an UPDATE lock, exact independent readback before release, active-transaction UPDATE confirmation, release and explicit replay of the identical response. A deadline or unexpected success fails the command; it is never accepted as lock evidence. BEGIN IMMEDIATE can reject before any upsert; this is lock rejection evidence, not a second mid-batch fault injection.',
        samples: rejectionReplay,
      },
      summaries: benchmarkConfig.sizes.map(size => {
        const samples = measuredLoad.filter(sample => sample.size === size);
        return { size, ingestion: summarize(samples.map(sample => sample.ingestionMs)), snapshotReader: summarize(samples.flatMap(sample => sample.probes.map(probe => probe.snapshotMs))), codeSearch: summarize(samples.flatMap(sample => sample.probes.map(probe => probe.searchMs))) };
      }),
      contentionSummary: { contender: summarize(measuredContention.map(sample => sample.contenderMs)), successes: measuredContention.filter(sample => sample.outcome === 'success').length, rejections: measuredContention.filter(sample => sample.outcome === 'rejected').length },
    };
  }

  console.log(JSON.stringify({
    verification: 'daesin-ingestion-quality', synthetic: true,
    transport: 'loopback HTTP with EUC-KR responses', storage: 'owned temporary SQLite',
    prismaClientInstances: benchmarkEnabled ? 4 : 2,
    connectionAccounting: { functionalClientInstances: 2, loadClientInstances: benchmarkEnabled ? 2 : null,
      shortContentionClientInstances: benchmarkEnabled ? 3 : null, rejectionReplayClientInstances: benchmarkEnabled ? 4 : null,
      fixtureContenderConnectionLimit: benchmarkEnabled ? 1 : null,
      physicalConnectionCount: 'Not instrumented; PrismaClient instance counts are not measured physical connection counts.' },
    realUpstreamRequests: 0, fixtureRequests: requests.length,
    startedAt, completedAt: new Date().toISOString(), observations, benchmark,
    measurementKind: benchmarkEnabled ? 'observed-synthetic-load-and-contention' : 'functional-synthetic-proof',
    limits: [
      'Synthetic fixtures do not prove live source completeness or a production freshness SLA.',
      'Upsert-only storage retains omitted rows; createdAt is first insertion, not last successful collection.',
      'Code search reads SQLite on every request; optional timings measure only this owned synthetic fixture, not production latency or capacity.',
      'Small repeated samples, cumulative DB state and unflushed OS/SQLite caches do not establish an SLA. No latency-performance threshold is applied; the fixture rejection case separately fails if its 3000ms diagnostic guard expires.',
      'Reader samples are bounded and may straddle commit; pendingAtStart records overlap, not an isolated database wait. Contender timing includes transport and parsing.',
      'No scheduler, operational database, or production deployment was changed by this command.',
    ],
    elapsedMs: Math.round(performance.now() - started),
  }, null, 2));
} finally {
  axios.defaults.adapter = originalAdapter;
  try {
    await Promise.all([writer?.$disconnect(), reader?.$disconnect(), locker?.$disconnect(), recoveryWriter?.$disconnect()]);
  } finally {
    try {
      if (server.listening) await new Promise(resolve => server.close(resolve));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
