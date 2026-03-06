import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidation } from '@/lib/api/withValidation';
import { getPageChatbotConfig } from '@/lib/data/global-chatbot-config';
import { geminiModelRequest } from '@/lib/utils/geminiApi';
import { apiError, checkAuth, ErrorCode } from '@/lib/utils/apiAuth';
import { logger } from '@/lib/utils/logger';
import type { PageType } from '@/lib/hooks/usePageContext';

/**
 * 에러 타입
 */
type ChatbotErrorType =
  | 'NETWORK_ERROR'
  | 'API_RATE_LIMIT'
  | 'API_OVERLOADED'
  | 'INVALID_RESPONSE'
  | 'CONTEXT_TOO_LARGE'
  | 'TIMEOUT'
  | 'UNKNOWN';

interface ChatbotError {
  type: ChatbotErrorType;
  message: string;
  retryable: boolean;
  retryAfter?: number;
}

/**
 * 탭 컨텍스트 타입 (공정계획 페이지용)
 */
interface TabContext {
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

interface GlobalChatRequest {
  query: string;
  pageType: PageType;
  pageContext?: {
    projectId?: string;
    buildingId?: string;
    postId?: string;
    pathname?: string;
  };
  tabContext?: TabContext;
  history?: Array<{
    role: 'user' | 'model';
    content: string;
  }>;
  thinkingMode?: boolean;
}

const pageTypeSchema = z.enum([
  'home',
  'projects',
  'project-detail',
  'project-gantt',
  'building-process-plan',
  'basement-process-plan',
  'posts',
  'post-detail',
  'profile',
  'admin',
  'admin-users',
  'admin-settings',
  'unknown',
]);

const historySchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string().trim().min(1),
});

const globalChatBodySchema = z.object({
  query: z.string().trim().min(1, '질문을 입력해주세요.').max(3000),
  pageType: pageTypeSchema,
  pageContext: z.object({
    projectId: z.string().optional(),
    buildingId: z.string().optional(),
    postId: z.string().optional(),
    pathname: z.string().optional(),
  }).optional(),
  tabContext: z.object({
    buildingName: z.string().optional(),
    totalUnits: z.number().optional(),
    coreCount: z.number().optional(),
    floorCount: z.number().optional(),
    currentStep: z.enum(['type_selection', 'quantity_input', 'calculation', 'review']).optional(),
    totalDays: z.number().optional(),
    hasErrors: z.boolean().optional(),
    errorMessages: z.array(z.string()).optional(),
    selectedTypes: z.record(z.string(), z.string().nullable()).optional(),
    calculatedDays: z.record(z.string(), z.number().nullable()).optional(),
    completionRate: z.number().optional(),
  }).optional(),
  history: z.array(historySchema).max(30).optional(),
  thinkingMode: z.boolean().optional(),
});

/**
 * 에러 타입 분류
 */
function classifyError(error: unknown, status?: number): ChatbotError {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('fetch') || message.includes('network') || message.includes('ECONNREFUSED')) {
    return {
      type: 'NETWORK_ERROR',
      message: '네트워크 연결 오류가 발생했습니다.',
      retryable: true,
      retryAfter: 1000,
    };
  }

  if (status === 429 || message.includes('rate limit') || message.includes('quota')) {
    return {
      type: 'API_RATE_LIMIT',
      message: 'API 요청 한도에 도달했습니다.',
      retryable: true,
      retryAfter: 5000,
    };
  }

  if (message.includes('overloaded') || status === 503) {
    return {
      type: 'API_OVERLOADED',
      message: '서버가 현재 과부하 상태입니다.',
      retryable: true,
      retryAfter: 3000,
    };
  }

  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return {
      type: 'TIMEOUT',
      message: '요청 시간이 초과되었습니다.',
      retryable: true,
      retryAfter: 2000,
    };
  }

  if (message.includes('not found for API version') || message.includes('invalid')) {
    return {
      type: 'INVALID_RESPONSE',
      message: 'API 설정 오류가 발생했습니다.',
      retryable: false,
    };
  }

  if (message.includes('context length') || message.includes('too long') || status === 400) {
    return {
      type: 'CONTEXT_TOO_LARGE',
      message: '대화 내용이 너무 깁니다. 새 대화를 시작해주세요.',
      retryable: false,
    };
  }

  return {
    type: 'UNKNOWN',
    message: `알 수 없는 오류가 발생했습니다: ${message}`,
    retryable: true,
    retryAfter: 2000,
  };
}

function mapChatbotErrorToApiCode(error: ChatbotError): ErrorCode {
  switch (error.type) {
    case 'API_RATE_LIMIT':
      return ErrorCode.LIMIT_EXCEEDED;
    case 'INVALID_RESPONSE':
    case 'CONTEXT_TOO_LARGE':
      return ErrorCode.INVALID_INPUT;
    case 'NETWORK_ERROR':
    case 'API_OVERLOADED':
    case 'TIMEOUT':
      return ErrorCode.EXTERNAL_API_ERROR;
    default:
      return ErrorCode.SERVER_ERROR;
  }
}

/**
 * 현재 단계 한글 레이블
 */
const STEP_LABELS: Record<string, string> = {
  type_selection: '공정 타입 선택',
  quantity_input: '물량 입력',
  calculation: '공정일수 계산',
  review: '검토',
};

/**
 * 페이지 컨텍스트를 프롬프트에 추가
 */
function buildContextPrompt(
  pageContext?: GlobalChatRequest['pageContext'],
  tabContext?: TabContext
): string {
  const lines: string[] = [];

  // 기본 페이지 컨텍스트
  if (pageContext) {
    if (pageContext.projectId) {
      lines.push(`- 현재 프로젝트 ID: ${pageContext.projectId}`);
    }
    if (pageContext.buildingId) {
      lines.push(`- 현재 건물 ID: ${pageContext.buildingId}`);
    }
    if (pageContext.postId) {
      lines.push(`- 현재 게시글 ID: ${pageContext.postId}`);
    }
    if (pageContext.pathname) {
      lines.push(`- 현재 경로: ${pageContext.pathname}`);
    }
  }

  // 탭 컨텍스트 (공정계획 페이지용)
  if (tabContext) {
    lines.push('');
    lines.push('## 현재 동 정보');
    if (tabContext.buildingName) {
      lines.push(`- 동명: ${tabContext.buildingName}`);
    }
    if (tabContext.totalUnits) {
      lines.push(`- 세대수: ${tabContext.totalUnits}세대`);
    }
    if (tabContext.coreCount) {
      lines.push(`- 코어 수: ${tabContext.coreCount}개`);
    }
    if (tabContext.floorCount) {
      lines.push(`- 층수: ${tabContext.floorCount}개층`);
    }

    lines.push('');
    lines.push('## 현재 작업 상태');
    if (tabContext.currentStep) {
      lines.push(`- 단계: ${STEP_LABELS[tabContext.currentStep] || tabContext.currentStep}`);
    }
    if (tabContext.totalDays !== undefined && tabContext.totalDays > 0) {
      lines.push(`- 총 공정일수: ${tabContext.totalDays}일`);
    }
    if (tabContext.completionRate !== undefined) {
      lines.push(`- 입력 완성도: ${tabContext.completionRate}%`);
    }

    // 공정별 계산 결과
    if (tabContext.calculatedDays) {
      const daysEntries = Object.entries(tabContext.calculatedDays).filter(
        ([, days]) => days !== null && days !== undefined && days > 0
      );
      if (daysEntries.length > 0) {
        lines.push('');
        lines.push('## 공정별 계산 결과');
        daysEntries.forEach(([category, days]) => {
          const type = tabContext.selectedTypes?.[category];
          lines.push(`- ${category}: ${type || '표준공정'} / ${days}일`);
        });
      }
    }

    // 오류 정보
    if (tabContext.hasErrors && tabContext.errorMessages && tabContext.errorMessages.length > 0) {
      lines.push('');
      lines.push('## 현재 오류');
      tabContext.errorMessages.slice(0, 3).forEach((msg) => {
        lines.push(`- ${msg}`);
      });
      if (tabContext.errorMessages.length > 3) {
        lines.push(`- 외 ${tabContext.errorMessages.length - 3}개 오류`);
      }
    }
  }

  if (lines.length === 0) return '';

  return `\n\n### 현재 컨텍스트\n${lines.join('\n')}`;
}

/**
 * 전역 챗봇 API
 * 페이지 타입에 따른 맞춤형 응답 제공
 */
export const POST = withValidation(
  { schema: globalChatBodySchema, source: 'body' },
  async (_request: NextRequest, body) => {
    // 인증 확인
    const authCheck = await checkAuth();
    if (!authCheck.success) return authCheck.response;

    try {
      const { query, pageType, pageContext, tabContext, history = [], thinkingMode = false } = body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return apiError(ErrorCode.SERVER_ERROR, 'Gemini API 키가 설정되지 않았습니다.');
      }

      // 페이지별 챗봇 설정 가져오기
      const config = getPageChatbotConfig(pageType);

      // 시스템 프롬프트 구성 (tabContext 포함)
      const systemPrompt = config.systemPrompt + buildContextPrompt(pageContext, tabContext);

      // 대화 히스토리 구성
      const contents = [];

      // 시스템 프롬프트를 첫 메시지로 추가
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: config.welcomeMessage }],
      });

      // 대화 히스토리 추가 (최근 10개만)
      const recentHistory = history.slice(-10);
      recentHistory.forEach((msg) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      });

      // 현재 질문 추가
      contents.push({
        role: 'user',
        parts: [{ text: query }],
      });

      // 모델 선택: 사고 모드에 따라 다른 모델 사용
      const model = thinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

      // Gemini API 호출
      const response = await geminiModelRequest(
        model,
        'generateContent',
        apiKey,
        {
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
            ...(thinkingMode && {
              thinkingConfig: {
                thinkingBudget: -1,
                includeThoughts: true,
              },
            }),
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const chatbotError = classifyError(
          new Error(errorData.error?.message || 'API 요청 실패'),
          response.status
        );
        return apiError(
          mapChatbotErrorToApiCode(chatbotError),
          chatbotError.message,
          {
            chatbotError,
            status: response.status,
          }
        );
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // 사고 모드일 때 thoughts와 answer를 분리하여 파싱
      let thoughts = '';
      let answer = '';

      for (const part of parts) {
        if (part.thought === true) {
          thoughts += part.text || '';
        } else {
          answer += part.text || '';
        }
      }

      return NextResponse.json({
        success: true,
        answer: answer || '응답을 받지 못했습니다.',
        thoughts: thinkingMode && thoughts ? thoughts : undefined,
        pageType,
      });
    } catch (error) {
      logger.error('Error in global-chat:', error);
      const chatbotError = classifyError(error);
      return apiError(
        mapChatbotErrorToApiCode(chatbotError),
        chatbotError.message,
        { chatbotError }
      );
    }
  }
);
