import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduleRouteSync } from '../src/scheduling/scheduleRouteSync.js';

describe('route sync schedule', () => {
  afterEach(() => vi.useRealTimers());

  it('runs at 06:00 Asia/Seoul on Monday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-26T20:59:00Z'));

    const task = scheduleRouteSync(async () => undefined);

    expect(task.getNextRun()?.toISOString()).toBe('2026-07-26T21:00:00.000Z');
    task.stop();
  });

  it('runs in one dedicated KST scheduler service, not web replicas', () => {
    const compose = JSON.parse(
      execFileSync('docker', ['compose', 'config', '--format', 'json'], {
        encoding: 'utf8',
      })
    );
    const serverSource = readFileSync('src/server.ts', 'utf8');

    expect(compose.services.scheduler.environment.TZ).toBe('Asia/Seoul');
    expect(compose.services.scheduler.command).toEqual(['node', 'dist/scheduler.js']);
    expect(compose.services.scheduler.healthcheck.disable).toBe(true);
    expect(serverSource).not.toContain('SyncRoutesUseCase');
  });
});
