import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// 에러 처리 유틸리티
// ============================================

/**
 * 에러 타입 가드
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * 에러 메시지 추출
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '알 수 없는 오류가 발생했습니다.';
}
