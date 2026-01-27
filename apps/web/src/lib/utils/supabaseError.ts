/**
 * Supabase 에러 처리 유틸리티
 *
 * 일관된 에러 처리와 사용자 친화적인 메시지를 제공합니다.
 */

import { PostgrestError } from '@supabase/supabase-js';

// ============================================
// 에러 코드 정의
// ============================================

export const ErrorCode = {
  // 인증 관련
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',

  // 권한 관련
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',

  // 데이터 관련
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FOREIGN_KEY_VIOLATION: 'FOREIGN_KEY_VIOLATION',

  // 네트워크/서버 관련
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT: 'TIMEOUT',

  // 기타
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ============================================
// API 에러 타입
// ============================================

export interface ApiError {
  message: string;
  code: ErrorCodeType;
  details?: string;
  originalError?: unknown;
}

// ============================================
// 서비스 결과 타입 (성공 또는 실패)
// ============================================

export type ServiceResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ApiError };

// ============================================
// 에러 메시지 매핑
// ============================================

const errorMessages: Record<string, { code: ErrorCodeType; message: string }> = {
  // Supabase Auth 에러
  'Invalid login credentials': {
    code: ErrorCode.AUTH_INVALID_TOKEN,
    message: '이메일 또는 비밀번호가 올바르지 않습니다.',
  },
  'Email not confirmed': {
    code: ErrorCode.AUTH_REQUIRED,
    message: '이메일 인증이 필요합니다.',
  },
  'JWT expired': {
    code: ErrorCode.AUTH_SESSION_EXPIRED,
    message: '세션이 만료되었습니다. 다시 로그인해주세요.',
  },
  'Invalid JWT': {
    code: ErrorCode.AUTH_INVALID_TOKEN,
    message: '인증 토큰이 유효하지 않습니다.',
  },

  // PostgreSQL 에러 코드
  '23505': {
    code: ErrorCode.DUPLICATE_ENTRY,
    message: '이미 존재하는 데이터입니다.',
  },
  '23503': {
    code: ErrorCode.FOREIGN_KEY_VIOLATION,
    message: '참조하는 데이터가 존재하지 않습니다.',
  },
  '23502': {
    code: ErrorCode.VALIDATION_ERROR,
    message: '필수 항목이 누락되었습니다.',
  },
  '42501': {
    code: ErrorCode.PERMISSION_DENIED,
    message: '이 작업을 수행할 권한이 없습니다.',
  },
  PGRST116: {
    code: ErrorCode.NOT_FOUND,
    message: '요청한 데이터를 찾을 수 없습니다.',
  },
};

// ============================================
// 에러 변환 함수
// ============================================

/**
 * Supabase/PostgreSQL 에러를 ApiError로 변환
 */
export function mapSupabaseError(error: PostgrestError | Error | unknown): ApiError {
  // PostgrestError 처리
  if (isPostgrestError(error)) {
    const mapped = errorMessages[error.code] || errorMessages[error.message];
    if (mapped) {
      return {
        ...mapped,
        details: error.details ?? undefined,
        originalError: error,
      };
    }
    return {
      code: ErrorCode.SERVER_ERROR,
      message: error.message || '데이터베이스 오류가 발생했습니다.',
      details: error.details ?? undefined,
      originalError: error,
    };
  }

  // 일반 Error 처리
  if (error instanceof Error) {
    const mapped = errorMessages[error.message];
    if (mapped) {
      return {
        ...mapped,
        originalError: error,
      };
    }

    // 네트워크 에러 감지
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        code: ErrorCode.NETWORK_ERROR,
        message: '네트워크 연결을 확인해주세요.',
        originalError: error,
      };
    }

    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message,
      originalError: error,
    };
  }

  // 알 수 없는 에러
  return {
    code: ErrorCode.UNKNOWN_ERROR,
    message: '알 수 없는 오류가 발생했습니다.',
    originalError: error,
  };
}

/**
 * PostgrestError 타입 가드
 */
function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

// ============================================
// 헬퍼 함수
// ============================================

/**
 * 성공 결과 생성
 */
export function success<T>(data: T): ServiceResult<T> {
  return { success: true, data, error: null };
}

/**
 * 실패 결과 생성
 */
export function failure<T>(error: ApiError): ServiceResult<T> {
  return { success: false, data: null, error };
}

/**
 * 에러를 실패 결과로 변환
 */
export function failureFromError<T>(error: unknown): ServiceResult<T> {
  return failure<T>(mapSupabaseError(error));
}

/**
 * ServiceResult에서 에러 메시지 추출
 */
export function getResultErrorMessage<T>(result: ServiceResult<T>): string | null {
  if (result.success) return null;
  return result.error.message;
}

/** 인증 관련 에러 코드 */
const AUTH_ERROR_CODES: ErrorCodeType[] = [
  ErrorCode.AUTH_REQUIRED,
  ErrorCode.AUTH_INVALID_TOKEN,
  ErrorCode.AUTH_SESSION_EXPIRED,
];

/** 권한 관련 에러 코드 */
const PERMISSION_ERROR_CODES: ErrorCodeType[] = [
  ErrorCode.PERMISSION_DENIED,
  ErrorCode.INSUFFICIENT_ROLE,
];

/**
 * 에러 코드가 인증 관련인지 확인
 */
export function isAuthError(error: ApiError): boolean {
  return AUTH_ERROR_CODES.includes(error.code);
}

/**
 * 에러 코드가 권한 관련인지 확인
 */
export function isPermissionError(error: ApiError): boolean {
  return PERMISSION_ERROR_CODES.includes(error.code);
}
