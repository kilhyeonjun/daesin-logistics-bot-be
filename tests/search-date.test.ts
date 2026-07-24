import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchDate } from '../src/domain/value-objects/SearchDate.js';

describe('SearchDate.defaultForCrawling', () => {
  afterEach(() => vi.useRealTimers());

  it('오전에도 오늘 날짜를 기본 수집일로 사용한다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 24, 10, 0, 0));

    expect(SearchDate.defaultForCrawling().getValue()).toBe('20260724');
  });
});
