/**
 * 캐시 서비스 인터페이스
 *
 * UseCase 레벨에서 사용하는 캐싱 추상화.
 * 날짜별 선별 무효화를 지원하기 위해 키에 날짜 prefix를 권장합니다.
 *
 * @example
 * // 키 패턴: `routes:byCode:${code}:${date}`
 * cache.get('routes:byCode:101102:20260131');
 * cache.invalidateByPattern('routes:*:20260131'); // 해당 날짜만 무효화
 */
export interface ICacheService {
  /**
   * 캐시에서 값을 가져옵니다.
   * @param key 캐시 키
   * @returns 캐시된 값 또는 null (미스 시)
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * 캐시에 값을 저장합니다.
   * @param key 캐시 키
   * @param value 저장할 값
   * @param ttlSeconds TTL (초 단위, 기본값은 구현체에서 결정)
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * 특정 키의 캐시를 삭제합니다.
   * @param key 캐시 키
   */
  delete(key: string): Promise<void>;

  /**
   * 패턴과 일치하는 모든 캐시를 무효화합니다.
   * 와일드카드 '*'를 지원합니다.
   *
   * @example
   * // 특정 날짜의 모든 캐시 무효화
   * invalidateByPattern('routes:*:20260131');
   *
   * @param pattern 글로브 패턴 (예: 'routes:*:20260131')
   * @returns 무효화된 키 개수
   */
  invalidateByPattern(pattern: string): Promise<number>;

  /**
   * 모든 캐시를 삭제합니다.
   */
  clear(): Promise<void>;

  /**
   * 캐시 통계를 반환합니다.
   */
  stats(): CacheStats;
}

export interface CacheStats {
  /** 총 캐시 항목 수 */
  size: number;
  /** 캐시 히트 수 */
  hits: number;
  /** 캐시 미스 수 */
  misses: number;
  /** 히트율 (0~1) */
  hitRate: number;
}
