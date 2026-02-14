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
import { getApiErrorMessage, getChatbotErrorDetails } from '@/lib/utils/api-error';

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

function mapErrorType(rawType: string): ChatbotError['type'] {
  const knownTypes: ChatbotError['type'][] = [
    'NETWORK_ERROR',
    'API_RATE_LIMIT',
    'API_OVERLOADED',
    'INVALID_RESPONSE',
    'CONTEXT_TOO_LARGE',
    'TIMEOUT',
    'UNKNOWN',
  ];
  return knownTypes.includes(rawType as ChatbotError['type'])
    ? (rawType as ChatbotError['type'])
    : 'UNKNOWN';
}

function mapApiCodeToChatbotType(code?: string): ChatbotError['type'] {
  switch (code) {
    case 'LIMIT_EXCEEDED':
      return 'API_RATE_LIMIT';
    case 'INVALID_INPUT':
    case 'VALIDATION_ERROR':
      return 'INVALID_RESPONSE';
    case 'EXTERNAL_API_ERROR':
      return 'API_OVERLOADED';
    default:
      return 'UNKNOWN';
  }
}

function toChatbotError(error: unknown): ChatbotError {
  const chatbotDetails = getChatbotErrorDetails(error);
  if (chatbotDetails) {
    return {
      type: mapErrorType(chatbotDetails.type),
      message: chatbotDetails.message,
      retryable: chatbotDetails.retryable,
      retryAfter: chatbotDetails.retryAfter,
    };
  }

  const apiError = error as { code?: string };
  const message = getApiErrorMessage(error, '요청 실패');
  const type = mapApiCodeToChatbotType(apiError?.code);
  const retryable = type === 'API_RATE_LIMIT' || type === 'API_OVERLOADED';

  return {
    type,
    message,
    retryable,
    ...(retryable ? { retryAfter: type === 'API_RATE_LIMIT' ? 5000 : 3000 } : {}),
  };
}

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
      const error = toChatbotError(data.error);

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
