import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCacheService } from '../src/infrastructure/cache/InMemoryCacheService.js';

describe('InMemoryCacheService', () => {
  let cache: InMemoryCacheService;

  beforeEach(() => {
    cache = new InMemoryCacheService();
  });

  describe('get/set', () => {
    it('캐시에 값을 저장하고 조회', async () => {
      await cache.set('key1', { data: 'test' });
      const result = await cache.get<{ data: string }>('key1');
      expect(result).toEqual({ data: 'test' });
    });

    it('존재하지 않는 키 조회 시 null 반환', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('TTL 만료 후 null 반환', async () => {
      await cache.set('expiring', 'value', 0);
      await new Promise((r) => setTimeout(r, 10));
      const result = await cache.get('expiring');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('특정 키 삭제', async () => {
      await cache.set('toDelete', 'value');
      await cache.delete('toDelete');
      const result = await cache.get('toDelete');
      expect(result).toBeNull();
    });
  });

  describe('invalidateByPattern', () => {
    it('패턴과 일치하는 키 모두 삭제', async () => {
      await cache.set('routes:byCode:101102:20260131', []);
      await cache.set('routes:byName:서울:20260131', []);
      await cache.set('routes:byCode:101102:20260130', []);

      const count = await cache.invalidateByPattern('routes:*:20260131');

      expect(count).toBe(2);
      expect(await cache.get('routes:byCode:101102:20260131')).toBeNull();
      expect(await cache.get('routes:byName:서울:20260131')).toBeNull();
      expect(await cache.get('routes:byCode:101102:20260130')).not.toBeNull();
    });

    it('일치하는 키가 없으면 0 반환', async () => {
      await cache.set('other:key', 'value');
      const count = await cache.invalidateByPattern('routes:*');
      expect(count).toBe(0);
    });
  });

  describe('clear', () => {
    it('모든 캐시 삭제', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });
  });

  describe('stats', () => {
    it('히트/미스 통계 추적', async () => {
      await cache.set('key1', 'value');

      await cache.get('key1');
      await cache.get('key1');
      await cache.get('nonexistent');

      const stats = cache.stats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
      expect(stats.size).toBe(1);
    });

    it('캐시가 비어있을 때 hitRate 0', () => {
      const stats = cache.stats();
      expect(stats.hitRate).toBe(0);
    });
  });
});
