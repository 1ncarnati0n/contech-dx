'use client';

/**
 * useAsyncData Hook
 * 비동기 데이터 fetching을 위한 공통 훅
 * loading, error, data 상태를 자동으로 관리
 */

import { useState, useEffect, useCallback, DependencyList } from 'react';
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      logger.error('useAsyncData fetch error:', errorObj);
      onError?.(errorObj);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, ...deps]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
