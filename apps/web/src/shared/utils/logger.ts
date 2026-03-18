/* eslint-disable no-console */
/**
 * 환경별 로깅 유틸리티
 * 개발 환경에서만 로그를 출력하고, 프로덕션에서는 에러/경고만 출력합니다.
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * 로거 인터페이스
 */
interface Logger {
  /** 디버그 로그 (개발 환경에서만 출력) */
  debug: (...args: unknown[]) => void;
  /** 정보 로그 (개발 환경에서만 출력) */
  info: (...args: unknown[]) => void;
  /** 경고 로그 (항상 출력) */
  warn: (...args: unknown[]) => void;
  /** 에러 로그 (항상 출력) */
  error: (...args: unknown[]) => void;
  /** 그룹 시작 (개발 환경에서만) */
  group: (label: string) => void;
  /** 그룹 종료 (개발 환경에서만) */
  groupEnd: () => void;
}

/**
 * 환경별 로거
 * 
 * @example
 * // 디버그 로그 (개발 환경에서만 출력)
 * logger.debug('🔍 ProjectList Debug:', { isAdmin, projectCount: 5 });
 * 
 * // 에러 로그 (항상 출력)
 * logger.error('❌ Failed to create project:', error);
 */
export const logger: Logger = {
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info('[INFO]', ...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },
  
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },
  
  group: (label: string) => {
    if (isDev) {
      console.group(label);
    }
  },
  
  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  },
};

/**
 * 성능 측정 유틸리티
 * 
 * @example
 * const end = perfLogger.start('fetchProjects');
 * await fetchProjects();
 * end(); // "[PERF] fetchProjects: 123.45ms"
 */
export const perfLogger = {
  start: (label: string): (() => void) => {
    if (!isDev) return () => {};
    
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      console.log(`[PERF] ${label}: ${(endTime - startTime).toFixed(2)}ms`);
    };
  },
};
