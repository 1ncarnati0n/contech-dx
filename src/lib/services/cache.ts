/**
 * 범용 TTL 기반 메모리 캐시 유틸리티
 * 서버 사이드에서 데이터를 일시적으로 캐싱합니다.
 */

import { logger } from '@/lib/utils/logger';

// ============================================
// 캐시 타입 정의
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  /** TTL (밀리초). 기본값: 5분 */
  ttl?: number;
  /** 캐시 이름 (로깅용) */
  name?: string;
}

// ============================================
// 기본 TTL 설정
// ============================================

/** 기본 TTL: 5분 */
export const DEFAULT_TTL = 5 * 60 * 1000;

/** 짧은 TTL: 1분 */
export const SHORT_TTL = 1 * 60 * 1000;

/** 긴 TTL: 15분 */
export const LONG_TTL = 15 * 60 * 1000;

// ============================================
// 캐시 클래스
// ============================================

export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTtl: number;
  private name: string;

  constructor(options: CacheOptions = {}) {
    this.defaultTtl = options.ttl ?? DEFAULT_TTL;
    this.name = options.name ?? 'cache';
  }

  /**
   * 캐시에서 데이터 조회
   * @param key 캐시 키
   * @returns 캐시된 데이터 또는 null (만료/없음)
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      logger.debug(`[${this.name}] Cache expired for key: ${key}`);
      return null;
    }

    logger.debug(`[${this.name}] Cache hit for key: ${key}`);
    return entry.data;
  }

  /**
   * 캐시에 데이터 저장
   * @param key 캐시 키
   * @param data 저장할 데이터
   * @param ttl 선택적 TTL (기본값 사용하지 않을 때)
   */
  set(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
    });
    logger.debug(`[${this.name}] Cache set for key: ${key}`);
  }

  /**
   * 특정 키의 캐시 무효화
   * @param key 캐시 키
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    logger.debug(`[${this.name}] Cache invalidated for key: ${key}`);
  }

  /**
   * 전체 캐시 무효화
   */
  invalidateAll(): void {
    this.cache.clear();
    logger.debug(`[${this.name}] All cache invalidated`);
  }

  /**
   * 캐시에서 데이터를 조회하거나, 없으면 fetcher를 실행하여 캐싱
   * @param key 캐시 키
   * @param fetcher 데이터를 가져오는 함수
   * @param ttl 선택적 TTL
   */
  async getOrFetch(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * 캐시 키 목록 조회
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 캐시 크기 조회
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 만료된 캐시 정리
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`[${this.name}] Cleaned ${cleaned} expired entries`);
    }
  }
}

// ============================================
// 미리 정의된 캐시 인스턴스
// ============================================

/** 프로젝트 목록 캐시 */
export const projectsCache = new MemoryCache<unknown>({
  name: 'projects',
  ttl: DEFAULT_TTL,
});

/** 사용자 프로필 캐시 */
export const profilesCache = new MemoryCache<unknown>({
  name: 'profiles',
  ttl: DEFAULT_TTL,
});

/** 게시글 목록 캐시 */
export const postsCache = new MemoryCache<unknown>({
  name: 'posts',
  ttl: SHORT_TTL,
});

// ============================================
// 캐시 키 생성 헬퍼
// ============================================

/**
 * 캐시 키 생성
 * @param prefix 접두사
 * @param params 파라미터들
 */
export function createCacheKey(prefix: string, ...params: (string | number | undefined)[]): string {
  const validParams = params.filter((p) => p !== undefined);
  return `${prefix}:${validParams.join(':')}`;
}
