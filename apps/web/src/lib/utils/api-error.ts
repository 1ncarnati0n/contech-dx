import { ErrorCode, type ApiError } from '@/lib/types/error';

type ApiErrorLike = Partial<ApiError> & {
  details?: Record<string, unknown>;
};

function isApiErrorLike(error: unknown): error is ApiErrorLike {
  return typeof error === 'object' && error !== null;
}

export function getApiErrorMessage(error: unknown, fallback = '요청 처리 중 오류가 발생했습니다.'): string {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (!isApiErrorLike(error)) {
    return fallback;
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  if (error.code && Object.values(ErrorCode).includes(error.code as ErrorCode)) {
    return `${error.code}: ${fallback}`;
  }

  return fallback;
}

export function getChatbotErrorDetails(error: unknown): {
  type: string;
  message: string;
  retryable: boolean;
  retryAfter?: number;
} | null {
  if (!isApiErrorLike(error) || !error.details) return null;

  const chatbotError = error.details.chatbotError;
  if (typeof chatbotError !== 'object' || chatbotError === null) return null;

  const candidate = chatbotError as {
    type?: unknown;
    message?: unknown;
    retryable?: unknown;
    retryAfter?: unknown;
  };

  if (typeof candidate.type !== 'string' || typeof candidate.message !== 'string') {
    return null;
  }

  return {
    type: candidate.type,
    message: candidate.message,
    retryable: typeof candidate.retryable === 'boolean' ? candidate.retryable : false,
    ...(typeof candidate.retryAfter === 'number' ? { retryAfter: candidate.retryAfter } : {}),
  };
}
