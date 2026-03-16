/**
 * 클라이언트 사이드 에러 처리 유틸리티
 *
 * 기존 error.ts의 타입 시스템과 logger.ts를 활용하여
 * 일관된 에러 처리를 제공합니다.
 */

import { toast } from 'sonner';
import { logger } from './logger';
import {
  type ApiError,
  ErrorCode,
  toApiError,
  ERROR_CODE_MESSAGES,
} from '@/shared/types/error';

/**
 * 에러 핸들러 옵션
 */
export interface ErrorHandlerOptions {
  /** 에러 컨텍스트 (로깅용) */
  context?: string;
  /** toast 알림 표시 여부 (기본값: true) */
  showToast?: boolean;
  /** 콘솔 로깅 여부 (기본값: true) */
  logError?: boolean;
  /** 인증 에러 시 실행할 콜백 */
  onAuthError?: () => void;
}

/**
 * 에러 코드별 toast 제목 매핑
 */
const ERROR_TITLES: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.AUTH_REQUIRED]: '인증 필요',
  [ErrorCode.AUTH_INVALID]: '인증 실패',
  [ErrorCode.AUTH_EXPIRED]: '인증 만료',
  [ErrorCode.PERMISSION_DENIED]: '권한 없음',
  [ErrorCode.ROLE_INSUFFICIENT]: '권한 부족',
  [ErrorCode.VALIDATION_ERROR]: '입력 오류',
  [ErrorCode.INVALID_INPUT]: '잘못된 입력',
  [ErrorCode.MISSING_FIELD]: '필수 항목 누락',
  [ErrorCode.NOT_FOUND]: '찾을 수 없음',
  [ErrorCode.ALREADY_EXISTS]: '이미 존재함',
  [ErrorCode.CONFLICT]: '충돌 발생',
  [ErrorCode.SERVER_ERROR]: '서버 오류',
  [ErrorCode.DATABASE_ERROR]: '데이터베이스 오류',
  [ErrorCode.EXTERNAL_API_ERROR]: '외부 서비스 오류',
  [ErrorCode.OPERATION_FAILED]: '작업 실패',
  [ErrorCode.LIMIT_EXCEEDED]: '요청 한도 초과',
  [ErrorCode.UNKNOWN]: '오류 발생',
};

/**
 * 에러 코드에 대한 toast 제목 반환
 */
export function getErrorTitle(code: ErrorCode): string {
  return ERROR_TITLES[code] || '오류 발생';
}

/**
 * 인증 관련 에러인지 확인
 */
export function isAuthError(code: ErrorCode): boolean {
  return [
    ErrorCode.AUTH_REQUIRED,
    ErrorCode.AUTH_INVALID,
    ErrorCode.AUTH_EXPIRED,
  ].includes(code);
}

/**
 * 권한 관련 에러인지 확인
 */
export function isPermissionError(code: ErrorCode): boolean {
  return [
    ErrorCode.PERMISSION_DENIED,
    ErrorCode.ROLE_INSUFFICIENT,
  ].includes(code);
}

/**
 * 유효성 검사 에러인지 확인
 */
export function isValidationError(code: ErrorCode): boolean {
  return [
    ErrorCode.VALIDATION_ERROR,
    ErrorCode.INVALID_INPUT,
    ErrorCode.MISSING_FIELD,
  ].includes(code);
}

/**
 * 통합 에러 처리 함수
 *
 * @example
 * try {
 *   await deletePost(id);
 * } catch (error) {
 *   handleError(error, {
 *     context: 'DeletePostButton',
 *     onAuthError: () => router.push('/login')
 *   });
 * }
 */
export function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): ApiError {
  const {
    context = '',
    showToast = true,
    logError = true,
    onAuthError,
  } = options;

  // 에러를 ApiError 형식으로 변환
  const apiError = toApiError(error);

  // 로깅
  if (logError) {
    const logContext = context ? `[${context}]` : '';
    logger.error(`${logContext} ${apiError.code}:`, apiError.message, apiError.details);
  }

  // toast 알림
  if (showToast) {
    const title = getErrorTitle(apiError.code);
    const description = apiError.message !== ERROR_CODE_MESSAGES[apiError.code]
      ? apiError.message
      : undefined;

    toast.error(title, { description });
  }

  // 인증 에러 콜백
  if (onAuthError && isAuthError(apiError.code)) {
    onAuthError();
  }

  return apiError;
}

/**
 * 성공 toast 표시 헬퍼
 */
export function showSuccess(message: string, description?: string): void {
  toast.success(message, { description });
}

/**
 * 경고 toast 표시 헬퍼
 */
export function showWarning(message: string, description?: string): void {
  toast.warning(message, { description });
}
