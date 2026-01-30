/**
 * 전역 챗봇 서비스 레이어
 * 재시도 로직, AbortController 지원
 */

import type { PageType } from '@/lib/hooks/usePageContext';

/**
 * 에러 타입
 */
export type ChatbotErrorType =
  | 'NETWORK_ERROR'
  | 'API_RATE_LIMIT'
  | 'API_OVERLOADED'
  | 'INVALID_RESPONSE'
  | 'CONTEXT_TOO_LARGE'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface ChatbotError {
  type: ChatbotErrorType;
  message: string;
  retryable: boolean;
  retryAfter?: number;
}

/**
 * 챗봇 메시지 타입
 */
export interface GlobalChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  thoughts?: string; // 사고 모드일 때 AI의 사고 과정
  timestamp: Date;
  error?: ChatbotError;
}

/**
 * 탭 컨텍스트 타입 (공정계획 페이지용)
 */
export interface TabContextForChat {
  buildingName?: string;
  totalUnits?: number;
  coreCount?: number;
  floorCount?: number;
  currentStep?: 'type_selection' | 'quantity_input' | 'calculation' | 'review';
  totalDays?: number;
  hasErrors?: boolean;
  errorMessages?: string[];
  selectedTypes?: Record<string, string | null>;
  calculatedDays?: Record<string, number | null>;
  completionRate?: number;
}

/**
 * 챗봇 요청 타입
 */
export interface GlobalChatRequest {
  query: string;
  pageType: PageType;
  pageContext?: {
    projectId?: string;
    buildingId?: string;
    postId?: string;
    pathname?: string;
  };
  tabContext?: TabContextForChat;
  history?: Array<{
    role: 'user' | 'model';
    content: string;
  }>;
  thinkingMode?: boolean;
}

/**
 * 챗봇 응답 타입
 */
export interface GlobalChatResponse {
  success: boolean;
  answer?: string;
  thoughts?: string; // 사고 모드일 때 AI의 사고 과정
  pageType?: PageType;
  error?: ChatbotError;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 8000,
};

/**
 * 지수 백오프 딜레이 계산
 */
function calculateBackoffDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  retryAfter?: number
): number {
  if (retryAfter) {
    return Math.min(retryAfter, maxDelay);
  }
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * 딜레이 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 전역 챗봇에 질문을 전송합니다.
 * 재시도 로직 및 AbortController 지원
 */
export async function sendGlobalChat(
  request: GlobalChatRequest,
  options?: {
    signal?: AbortSignal;
    retryConfig?: Partial<RetryConfig>;
    onRetry?: (attempt: number, error: ChatbotError) => void;
  }
): Promise<GlobalChatResponse> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options?.retryConfig };
  let lastError: ChatbotError | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    // AbortSignal 체크
    if (options?.signal?.aborted) {
      return {
        success: false,
        error: {
          type: 'UNKNOWN',
          message: '요청이 취소되었습니다.',
          retryable: false,
        },
      };
    }

    try {
      const response = await fetch('/api/gemini/global-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: request.query,
          pageType: request.pageType,
          pageContext: request.pageContext,
          tabContext: request.tabContext,
          history: request.history || [],
          thinkingMode: request.thinkingMode,
        }),
        signal: options?.signal,
      });

      const data = await response.json();

      // 성공
      if (response.ok && data.success) {
        return {
          success: true,
          answer: data.answer,
          thoughts: data.thoughts,
          pageType: data.pageType,
        };
      }

      // 에러 응답
      const error: ChatbotError = data.error || {
        type: 'UNKNOWN',
        message: data.error?.message || '요청 실패',
        retryable: false,
      };

      // 재시도 불가능한 에러
      if (!error.retryable) {
        return { success: false, error };
      }

      lastError = error;

      // 마지막 시도가 아니면 재시도
      if (attempt < config.maxRetries) {
        const backoffDelay = calculateBackoffDelay(
          attempt,
          config.baseDelay,
          config.maxDelay,
          error.retryAfter
        );

        options?.onRetry?.(attempt + 1, error);
        await delay(backoffDelay);
      }
    } catch (fetchError) {
      // 요청 취소
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return {
          success: false,
          error: {
            type: 'UNKNOWN',
            message: '요청이 취소되었습니다.',
            retryable: false,
          },
        };
      }

      // 네트워크 에러
      const error: ChatbotError = {
        type: 'NETWORK_ERROR',
        message: fetchError instanceof Error ? fetchError.message : '네트워크 오류',
        retryable: true,
        retryAfter: 1000,
      };

      lastError = error;

      // 마지막 시도가 아니면 재시도
      if (attempt < config.maxRetries) {
        const backoffDelay = calculateBackoffDelay(
          attempt,
          config.baseDelay,
          config.maxDelay,
          error.retryAfter
        );

        options?.onRetry?.(attempt + 1, error);
        await delay(backoffDelay);
      }
    }
  }

  // 모든 재시도 실패
  return {
    success: false,
    error: lastError || {
      type: 'UNKNOWN',
      message: '최대 재시도 횟수를 초과했습니다.',
      retryable: false,
    },
  };
}

/**
 * 간단한 질문 전송 (재시도 없음)
 */
export async function sendSimpleGlobalChat(
  query: string,
  pageType: PageType
): Promise<GlobalChatResponse> {
  return sendGlobalChat({
    query,
    pageType,
  });
}
