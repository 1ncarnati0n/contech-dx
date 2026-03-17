/**
 * Supabase 클라이언트 인증 래퍼 함수
 *
 * 클라이언트 사이드에서 Supabase 작업 시 인증 확인을 자동화합니다.
 * 반복되는 인증 확인 코드를 추상화하여 일관성 있는 에러 처리를 제공합니다.
 */

import { createClient as createBrowserClient } from '@/shared/lib/supabase/client';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * 서비스 결과 타입
 */
export interface ServiceResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

/**
 * 인증이 필요한 작업을 위한 래퍼 함수
 *
 * 사용자 인증을 확인하고 인증된 경우에만 작업을 실행합니다.
 *
 * @param operation - Supabase 클라이언트와 인증된 사용자를 받아 작업을 수행하는 함수
 * @returns ServiceResult 형태의 결과
 *
 * @example
 * ```ts
 * // 기존 방식
 * async function createPost(title: string, content: string) {
 *   const supabase = createBrowserClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   if (!user) return { post: null, error: { message: '로그인이 필요합니다.' } };
 *   // ... 실제 로직
 * }
 *
 * // 래퍼 사용
 * async function createPost(title: string, content: string) {
 *   return withClientAuth(async (supabase, user) => {
 *     const { data, error } = await supabase
 *       .from('posts')
 *       .insert({ title, content, author_id: user.id })
 *       .select()
 *       .single();
 *     return { data, error };
 *   });
 * }
 * ```
 */
export async function withClientAuth<T>(
  operation: (supabase: SupabaseClient, user: User) => Promise<{ data: T | null; error: { message: string } | null }>
): Promise<ServiceResult<T>> {
  const supabase = createBrowserClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        data: null,
        error: { message: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' },
      };
    }

    const result = await operation(supabase, user);

    if (result.error) {
      return {
        data: null,
        error: { message: result.error.message },
      };
    }

    return {
      data: result.data,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return {
      data: null,
      error: { message, code: 'UNKNOWN_ERROR' },
    };
  }
}

/**
 * 인증 없이 사용 가능한 작업을 위한 래퍼 함수 (선택적 인증)
 *
 * 인증 여부와 관계없이 작업을 실행하지만, 인증된 경우 user 정보를 제공합니다.
 *
 * @param operation - Supabase 클라이언트와 선택적 사용자를 받아 작업을 수행하는 함수
 * @returns ServiceResult 형태의 결과
 */
export async function withOptionalAuth<T>(
  operation: (supabase: SupabaseClient, user: User | null) => Promise<{ data: T | null; error: { message: string } | null }>
): Promise<ServiceResult<T>> {
  const supabase = createBrowserClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const result = await operation(supabase, user);

    if (result.error) {
      return {
        data: null,
        error: { message: result.error.message },
      };
    }

    return {
      data: result.data,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return {
      data: null,
      error: { message, code: 'UNKNOWN_ERROR' },
    };
  }
}

/**
 * 에러 메시지 추출 헬퍼
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return '알 수 없는 오류가 발생했습니다.';
}
