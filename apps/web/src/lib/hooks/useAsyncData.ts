'use client';

/**
 * useAsyncData Hook
 * 비동기 데이터 fetching을 위한 공통 훅
 * loading, error, data 상태를 자동으로 관리
 */

import { useState, useEffect, useCallback, useRef, DependencyList } from 'react';
import { logger } from '@/lib/utils/logger';

interface UseAsyncDataOptions<T> {
  /** 초기 데이터 */
  initialData?: T;
  /** 자동 fetch 여부 (기본값: true) */
  autoFetch?: boolean;
  /** 에러 발생 시 콜백 */
  onError?: (error: Error) => void;
  /** 성공 시 콜백 */
  onSuccess?: (data: T) => void;
}

interface UseAsyncDataReturn<T> {
  /** 로딩 상태 */
  loading: boolean;
  /** 에러 객체 */
  error: Error | null;
  /** 데이터 */
  data: T | null;
  /** 수동으로 다시 fetch */
  refetch: () => Promise<void>;
  /** 데이터 직접 설정 */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  /** 로딩 상태 직접 설정 */
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * 의존성 배열 비교 헬퍼
 * 얕은 비교로 deps 변경 여부 확인
 */
function depsAreSame(prevDeps: DependencyList, nextDeps: DependencyList): boolean {
  if (prevDeps.length !== nextDeps.length) return false;
  for (let i = 0; i < prevDeps.length; i++) {
    if (!Object.is(prevDeps[i], nextDeps[i])) return false;
  }
  return true;
}

/**
 * 비동기 데이터 fetching 훅
 *
 * @example
 * ```tsx
 * const { data: projects, loading, error, refetch } = useAsyncData(
 *   () => getProjects(),
 *   [],
 *   { initialData: [] }
 * );
 * ```
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList = [],
  options: UseAsyncDataOptions<T> = {}
): UseAsyncDataReturn<T> {
  const {
    initialData = null,
    autoFetch = true,
    onError,
    onSuccess,
  } = options;

  const [data, setData] = useState<T | null>(initialData as T | null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  // 안정적인 fetcher 참조 유지
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // 안정적인 콜백 참조 유지
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // deps 변경 추적을 위한 ref
  const depsRef = useRef(deps);
  if (!depsAreSame(depsRef.current, deps)) {
    depsRef.current = deps;
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcherRef.current();
      setData(result);
      onSuccessRef.current?.(result);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      logger.error('useAsyncData fetch error:', errorObj);
      onErrorRef.current?.(errorObj);
    } finally {
      setLoading(false);
    }
  }, []); // fetcherRef를 통해 최신 fetcher를 참조

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [fetchData, autoFetch]);

  return {
    loading,
    error,
    data,
    refetch: fetchData,
    setData,
    setLoading,
  };
}

/**
 * 배열 데이터 전용 훅 (편의 타입)
 */
export function useAsyncList<T>(
  fetcher: () => Promise<T[]>,
  deps: DependencyList = [],
  options: Omit<UseAsyncDataOptions<T[]>, 'initialData'> = {}
): UseAsyncDataReturn<T[]> {
  return useAsyncData<T[]>(fetcher, deps, {
    ...options,
    initialData: [],
  });
}

export default useAsyncData;
