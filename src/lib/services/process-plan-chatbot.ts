/**
 * 공정계획 챗봇 서비스 레이어
 * 재시도 로직, AbortController 지원
 */

import type {
  ProcessPlanChatContext,
  ProcessPlanChatResponse,
  ChatContextSnapshot,
  ChatbotError,
} from '@/components/buildings/ProcessPlanChatbotTypes';

export interface ProcessPlanChatRequest {
  query: string;
  context: ProcessPlanChatContext;
  contextSnapshot?: ChatContextSnapshot;
  history?: Array<{
    role: 'user' | 'model';
    content: string;
  }>;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1초
  maxDelay: 8000, // 8초
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
  // 지수 백오프: 1초, 2초, 4초...
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
 * 공정계획 챗봇에 질문을 전송합니다.
 * 재시도 로직 및 AbortController 지원
 */
export async function sendProcessPlanChat(
  request: ProcessPlanChatRequest,
  options?: {
    signal?: AbortSignal;
    retryConfig?: Partial<RetryConfig>;
    onRetry?: (attempt: number, error: ChatbotError) => void;
  }
): Promise<ProcessPlanChatResponse> {
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
      const response = await fetch('/api/gemini/process-plan-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: request.query,
          context: request.context,
          contextSnapshot: request.contextSnapshot,
          history: request.history || [],
        }),
        signal: options?.signal,
      });

      const data = await response.json();

      // 성공
      if (response.ok && data.success) {
        return {
          success: true,
          answer: data.answer,
          citations: data.citations,
          highlightTargets: data.highlightTargets,
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

        // 재시도 콜백
        options?.onRetry?.(attempt + 1, error);

        // 딜레이 후 재시도
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
export async function sendSimpleChat(
  query: string,
  projectId: string,
  page: 'building' | 'basement' = 'building'
): Promise<ProcessPlanChatResponse> {
  return sendProcessPlanChat({
    query,
    context: { page, projectId },
  });
}

/**
 * 컨텍스트와 함께 질문 전송
 */
export async function sendChatWithContext(
  query: string,
  context: ProcessPlanChatContext,
  contextSnapshot: ChatContextSnapshot,
  history?: Array<{ role: 'user' | 'model'; content: string }>,
  signal?: AbortSignal
): Promise<ProcessPlanChatResponse> {
  return sendProcessPlanChat(
    {
      query,
      context,
      contextSnapshot,
      history,
    },
    { signal }
  );
}
