'use client';

/**
 * 에러 처리 훅
 *
 * 컴포넌트에서 일관된 에러 처리를 위한 훅입니다.
 * 인증 에러 시 자동으로 로그인 페이지로 리디렉션합니다.
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  handleError,
  type ErrorHandlerOptions,
} from '@/shared/utils/error-handler';
import type { ApiError } from '@/shared/types/error';

/**
 * 에러 처리 훅
 *
 * @param context - 에러 컨텍스트 (로깅용)
 * @returns 에러 처리 함수
 *
 * @example
 * function DeletePostButton({ postId }: { postId: string }) {
 *   const handleError = useErrorHandler('DeletePostButton');
 *
 *   const handleDelete = async () => {
 *     try {
 *       await supabase.from('posts').delete().eq('id', postId);
 *     } catch (error) {
 *       handleError(error);
 *     }
 *   };
 * }
 */
export function useErrorHandler(context: string = '') {
  const router = useRouter();

  const handleAuthError = useCallback(() => {
    router.push('/login');
  }, [router]);

  return useCallback(
    (error: unknown, options?: Omit<ErrorHandlerOptions, 'context' | 'onAuthError'>): ApiError => {
      return handleError(error, {
        context,
        onAuthError: handleAuthError,
        ...options,
      });
    },
    [context, handleAuthError]
  );
}

/**
 * 커스텀 인증 에러 핸들러를 사용하는 에러 처리 훅
 *
 * @param context - 에러 컨텍스트 (로깅용)
 * @param onAuthError - 커스텀 인증 에러 핸들러
 * @returns 에러 처리 함수
 *
 * @example
 * function MyComponent() {
 *   const handleError = useErrorHandlerWithCallback('MyComponent', () => {
 *     // 커스텀 인증 에러 처리
 *     showLoginModal();
 *   });
 * }
 */
export function useErrorHandlerWithCallback(
  context: string,
  onAuthError?: () => void
) {
  return useCallback(
    (error: unknown, options?: Omit<ErrorHandlerOptions, 'context' | 'onAuthError'>): ApiError => {
      return handleError(error, {
        context,
        onAuthError,
        ...options,
      });
    },
    [context, onAuthError]
  );
}
