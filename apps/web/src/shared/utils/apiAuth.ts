/**
 * API 라우트 인증 미들웨어
 *
 * API 라우트에서 사용자 인증을 쉽게 적용할 수 있는 헬퍼 함수입니다.
 * 인증되지 않은 요청에 대해 401 응답을 자동으로 반환합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import {
  ErrorCode,
  createApiError,
  getHttpStatus,
  type ApiError,
  type ApiResponse,
} from '@/shared/types/error';

export interface AuthResult {
  user: User;
}

/**
 * 인증 결과를 담는 타입
 */
type AuthCheckResult =
  | { success: true; user: User }
  | { success: false; response: NextResponse };

/**
 * 현재 요청의 인증 상태를 확인합니다.
 *
 * @returns 인증 성공 시 user 객체, 실패 시 에러 응답
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const authCheck = await checkAuth();
 *   if (!authCheck.success) return authCheck.response;
 *
 *   const { user } = authCheck;
 *   // 이후 로직...
 * }
 * ```
 */
export async function checkAuth(): Promise<AuthCheckResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      const apiError = createApiError(ErrorCode.AUTH_REQUIRED);
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: apiError } satisfies ApiResponse<never>,
          { status: getHttpStatus(ErrorCode.AUTH_REQUIRED) }
        ),
      };
    }

    return { success: true, user };
  } catch {
    const apiError = createApiError(ErrorCode.SERVER_ERROR, '인증 확인 중 오류가 발생했습니다.');
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: apiError } satisfies ApiResponse<never>,
        { status: getHttpStatus(ErrorCode.SERVER_ERROR) }
      ),
    };
  }
}

/**
 * 고차 함수 형태의 인증 미들웨어
 *
 * @param handler - 인증된 사용자에게만 실행될 핸들러 함수
 * @returns NextResponse
 *
 * @example
 * ```ts
 * export const POST = withAuth(async (request, user) => {
 *   // user는 인증된 사용자
 *   const data = await request.json();
 *   return NextResponse.json({ success: true, data });
 * });
 * ```
 */
export function withAuth<T extends NextRequest>(
  handler: (request: T, user: User) => Promise<NextResponse>
) {
  return async (request: T): Promise<NextResponse> => {
    const authCheck = await checkAuth();

    if (!authCheck.success) {
      return authCheck.response;
    }

    return handler(request, authCheck.user);
  };
}

/**
 * API 에러 응답을 생성하는 헬퍼 함수
 *
 * @param code - ErrorCode enum 값
 * @param message - 에러 메시지 (선택, 기본 메시지 사용 가능)
 * @param details - 추가 에러 상세 정보
 */
export function apiError(
  code: ErrorCode,
  message?: string,
  details?: Record<string, unknown>
): NextResponse {
  const error = createApiError(code, message, details);
  return NextResponse.json(
    { success: false, error } satisfies ApiResponse<never>,
    { status: getHttpStatus(code) }
  );
}

/**
 * API 성공 응답을 생성하는 헬퍼 함수
 */
export function apiSuccess<T extends Record<string, unknown>>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    { success: true, data } satisfies ApiResponse<T>,
    { status }
  );
}

// Re-export error types for convenience
export { ErrorCode, createApiError, getHttpStatus, type ApiError, type ApiResponse };
