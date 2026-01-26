/**
 * 표준 API 에러 타입
 *
 * 애플리케이션 전체에서 일관된 에러 처리를 위한 타입과 유틸리티입니다.
 */

/**
 * 에러 코드 열거형
 *
 * 에러 유형을 식별하기 위한 코드입니다.
 * 클라이언트에서 에러 유형에 따른 처리를 할 수 있습니다.
 */
export enum ErrorCode {
  // 인증 관련
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_EXPIRED = 'AUTH_EXPIRED',

  // 권한 관련
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_INSUFFICIENT = 'ROLE_INSUFFICIENT',

  // 유효성 검사
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_FIELD = 'MISSING_FIELD',

  // 리소스 관련
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // 서버 관련
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',

  // 비즈니스 로직
  OPERATION_FAILED = 'OPERATION_FAILED',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',

  // 알 수 없는 오류
  UNKNOWN = 'UNKNOWN',
}

/**
 * API 에러 인터페이스
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  field?: string; // 특정 필드 관련 에러인 경우
}

/**
 * API 응답 래퍼 타입
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * HTTP 상태 코드와 에러 코드 매핑
 */
export const ERROR_CODE_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.AUTH_REQUIRED]: 401,
  [ErrorCode.AUTH_INVALID]: 401,
  [ErrorCode.AUTH_EXPIRED]: 401,
  [ErrorCode.PERMISSION_DENIED]: 403,
  [ErrorCode.ROLE_INSUFFICIENT]: 403,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_FIELD]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.SERVER_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_API_ERROR]: 502,
  [ErrorCode.OPERATION_FAILED]: 500,
  [ErrorCode.LIMIT_EXCEEDED]: 429,
  [ErrorCode.UNKNOWN]: 500,
};

/**
 * 에러 코드에 대한 기본 메시지
 */
export const ERROR_CODE_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_REQUIRED]: '인증이 필요합니다. 로그인 후 다시 시도해주세요.',
  [ErrorCode.AUTH_INVALID]: '인증 정보가 올바르지 않습니다.',
  [ErrorCode.AUTH_EXPIRED]: '인증이 만료되었습니다. 다시 로그인해주세요.',
  [ErrorCode.PERMISSION_DENIED]: '이 작업을 수행할 권한이 없습니다.',
  [ErrorCode.ROLE_INSUFFICIENT]: '이 기능을 사용하기 위한 권한이 부족합니다.',
  [ErrorCode.VALIDATION_ERROR]: '입력값이 올바르지 않습니다.',
  [ErrorCode.INVALID_INPUT]: '잘못된 입력입니다.',
  [ErrorCode.MISSING_FIELD]: '필수 필드가 누락되었습니다.',
  [ErrorCode.NOT_FOUND]: '요청한 리소스를 찾을 수 없습니다.',
  [ErrorCode.ALREADY_EXISTS]: '이미 존재하는 리소스입니다.',
  [ErrorCode.CONFLICT]: '리소스 충돌이 발생했습니다.',
  [ErrorCode.SERVER_ERROR]: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  [ErrorCode.DATABASE_ERROR]: '데이터베이스 오류가 발생했습니다.',
  [ErrorCode.EXTERNAL_API_ERROR]: '외부 서비스 오류가 발생했습니다.',
  [ErrorCode.OPERATION_FAILED]: '작업에 실패했습니다.',
  [ErrorCode.LIMIT_EXCEEDED]: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  [ErrorCode.UNKNOWN]: '알 수 없는 오류가 발생했습니다.',
};

/**
 * ApiError 생성 헬퍼 함수
 */
export function createApiError(
  code: ErrorCode,
  message?: string,
  details?: Record<string, unknown>,
  field?: string
): ApiError {
  return {
    code,
    message: message || ERROR_CODE_MESSAGES[code],
    ...(details && { details }),
    ...(field && { field }),
  };
}

/**
 * 에러 코드에 해당하는 HTTP 상태 코드 반환
 */
export function getHttpStatus(code: ErrorCode): number {
  return ERROR_CODE_STATUS_MAP[code] || 500;
}

/**
 * 알려지지 않은 에러를 ApiError로 변환
 */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return createApiError(ErrorCode.UNKNOWN, error.message);
  }

  if (typeof error === 'string') {
    return createApiError(ErrorCode.UNKNOWN, error);
  }

  return createApiError(ErrorCode.UNKNOWN);
}

/**
 * ApiError 타입 가드
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    Object.values(ErrorCode).includes((error as ApiError).code)
  );
}

/**
 * 에러가 재시도 가능한지 확인
 */
export function isRetryableError(error: ApiError): boolean {
  const retryableCodes: ErrorCode[] = [
    ErrorCode.SERVER_ERROR,
    ErrorCode.DATABASE_ERROR,
    ErrorCode.EXTERNAL_API_ERROR,
    ErrorCode.LIMIT_EXCEEDED,
  ];
  return retryableCodes.includes(error.code);
}
