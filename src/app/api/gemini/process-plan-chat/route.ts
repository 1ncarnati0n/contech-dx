import { NextRequest, NextResponse } from 'next/server';
import { buildFullSystemPrompt } from '@/lib/data/chatbot-prompts';
import { parseHighlightMarkersEnhanced } from '@/lib/utils/highlight-registry';
import { geminiModelRequest } from '@/lib/utils/geminiApi';
import { checkAuth } from '@/lib/utils/apiAuth';
import type {
  ChatContextSnapshot,
  ChatbotError,
  ChatbotErrorType,
  HighlightTarget,
} from '@/components/buildings/ProcessPlanChatbotTypes';

interface CitationSource {
  startIndex?: number;
  endIndex?: number;
  uri?: string;
  license?: string;
}

interface ProcessPlanChatRequest {
  query: string;
  context: {
    page: 'building' | 'basement';
    buildingId?: string;
    projectId: string;
    processPlan?: unknown;
    selectedProcessType?: string;
  };
  contextSnapshot?: ChatContextSnapshot;
  history?: Array<{
    role: 'user' | 'model';
    content: string;
  }>;
}

/**
 * 에러 타입 분류
 */
function classifyError(error: unknown, status?: number): ChatbotError {
  const message = error instanceof Error ? error.message : String(error);

  // 네트워크 에러
  if (message.includes('fetch') || message.includes('network') || message.includes('ECONNREFUSED')) {
    return {
      type: 'NETWORK_ERROR',
      message: '네트워크 연결 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
      retryable: true,
      retryAfter: 1000,
    };
  }

  // Rate limit
  if (status === 429 || message.includes('rate limit') || message.includes('quota')) {
    return {
      type: 'API_RATE_LIMIT',
      message: 'API 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.',
      retryable: true,
      retryAfter: 5000,
    };
  }

  // Overloaded
  if (message.includes('overloaded') || status === 503) {
    return {
      type: 'API_OVERLOADED',
      message: '서버가 현재 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
      retryable: true,
      retryAfter: 3000,
    };
  }

  // Timeout
  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return {
      type: 'TIMEOUT',
      message: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
      retryable: true,
      retryAfter: 2000,
    };
  }

  // Invalid response
  if (message.includes('not found for API version') || message.includes('invalid')) {
    return {
      type: 'INVALID_RESPONSE',
      message: 'API 설정 오류가 발생했습니다. 관리자에게 문의하세요.',
      retryable: false,
    };
  }

  // Context too large
  if (message.includes('context length') || message.includes('too long') || status === 400) {
    return {
      type: 'CONTEXT_TOO_LARGE',
      message: '대화 내용이 너무 깁니다. 새 대화를 시작해주세요.',
      retryable: false,
    };
  }

  // Unknown
  return {
    type: 'UNKNOWN',
    message: `알 수 없는 오류가 발생했습니다: ${message}`,
    retryable: true,
    retryAfter: 2000,
  };
}

/**
 * 컨텍스트 스냅샷을 프롬프트 텍스트로 변환
 */
function contextSnapshotToPromptText(snapshot?: ChatContextSnapshot): string {
  if (!snapshot) return '';

  const lines: string[] = [];

  // 건물 정보
  if (Object.keys(snapshot.buildingInfo).length > 0) {
    lines.push('### 현재 동 정보');
    if (snapshot.buildingInfo.name) lines.push(`- 동명: ${snapshot.buildingInfo.name}`);
    if (snapshot.buildingInfo.totalUnits) lines.push(`- 세대수: ${snapshot.buildingInfo.totalUnits}세대`);
    if (snapshot.buildingInfo.coreCount) lines.push(`- 코어 수: ${snapshot.buildingInfo.coreCount}개`);
    if (snapshot.buildingInfo.floorCount) lines.push(`- 층수: ${snapshot.buildingInfo.floorCount}개층`);
  }

  // 물량 요약
  if (snapshot.quantitySummary) {
    lines.push('');
    lines.push('### 물량 현황');
    if (snapshot.quantitySummary.totalFormwork) {
      lines.push(`- 총 형틀: ${snapshot.quantitySummary.totalFormwork.toLocaleString()}㎡`);
    }
    if (snapshot.quantitySummary.totalRebar) {
      lines.push(`- 총 철근: ${snapshot.quantitySummary.totalRebar.toLocaleString()}ton`);
    }
    if (snapshot.quantitySummary.totalConcrete) {
      lines.push(`- 총 콘크리트: ${snapshot.quantitySummary.totalConcrete.toLocaleString()}㎥`);
    }
    if (snapshot.quantitySummary.completionRate !== undefined) {
      lines.push(`- 입력 완성도: ${snapshot.quantitySummary.completionRate}%`);
    }
    if (snapshot.quantitySummary.missingFloors.length > 0) {
      lines.push(`- 누락 항목: ${snapshot.quantitySummary.missingFloors.length}개`);
    }
  }

  // 공정계획 요약
  if (snapshot.processPlanSummary) {
    lines.push('');
    lines.push('### 공정계획 현황');
    const categories = ['버림', '기초', '지하층', '셋팅층', '기준층', '옥탑층'] as const;
    for (const category of categories) {
      const type = snapshot.processPlanSummary.selectedTypes[category];
      const days = snapshot.processPlanSummary.calculatedDays[category];
      if (type || days) {
        lines.push(`- ${category}: ${type || '미선택'} / ${days ? `${days}일` : '미계산'}`);
      }
    }
    if (snapshot.processPlanSummary.totalDays) {
      lines.push(`- **총 공정일수: ${snapshot.processPlanSummary.totalDays}일**`);
    }
  }

  // 현재 단계
  if (snapshot.validationState) {
    const stepLabels: Record<string, string> = {
      type_selection: '공정 타입 선택 단계',
      quantity_input: '물량 입력 단계',
      calculation: '공정일수 계산 단계',
      review: '검토 단계',
    };
    lines.push('');
    lines.push(`### 현재 단계: ${stepLabels[snapshot.validationState.currentStep] || snapshot.validationState.currentStep}`);

    // 오류
    if (snapshot.validationState.errors.length > 0) {
      lines.push('');
      lines.push('### 현재 오류');
      snapshot.validationState.errors.forEach(err => {
        lines.push(`- ❌ ${err.message}`);
      });
    }

    // 경고
    if (snapshot.validationState.warnings.length > 0) {
      lines.push('');
      lines.push('### 주의사항');
      snapshot.validationState.warnings.forEach(warn => {
        lines.push(`- ⚠️ ${warn.message}`);
      });
    }
  }

  return lines.join('\n');
}

/**
 * 공정계획 전용 챗봇 API
 * 컨텍스트 정보를 포함하여 Gemini API에 요청합니다.
 */
export async function POST(request: NextRequest) {
  // 인증 확인
  const authCheck = await checkAuth();
  if (!authCheck.success) return authCheck.response;

  try {
    const body: ProcessPlanChatRequest = await request.json();
    const { query, context, contextSnapshot, history = [] } = body;

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'INVALID_RESPONSE' as ChatbotErrorType,
            message: '질문을 입력해주세요.',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    if (!context.projectId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'INVALID_RESPONSE' as ChatbotErrorType,
            message: '프로젝트 ID가 필요합니다.',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'INVALID_RESPONSE' as ChatbotErrorType,
            message: 'Gemini API 키가 설정되지 않았습니다.',
            retryable: false,
          },
        },
        { status: 500 }
      );
    }

    // 컨텍스트 정보를 프롬프트 텍스트로 변환
    const contextInfo = contextSnapshotToPromptText(contextSnapshot);

    // 에러 목록 추출
    const errors = contextSnapshot?.validationState?.errors?.map(e => ({
      field: e.field,
      message: e.message,
    })) || [];

    // 확장된 시스템 프롬프트 생성
    const systemPrompt = buildFullSystemPrompt({
      page: context.page,
      contextInfo,
      currentStep: contextSnapshot?.validationState?.currentStep,
      errors: errors.length > 0 ? errors : undefined,
      includeGlossary: query.includes('용어') || query.includes('뜻') || query.includes('무엇'),
    });

    // 대화 히스토리 구성
    const contents = [];

    // 시스템 프롬프트를 첫 메시지로 추가
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt }],
    });
    contents.push({
      role: 'model',
      parts: [{ text: '네, 공정계획 도우미입니다. 공정계획 수립에 관한 질문에 답변드리겠습니다. 무엇을 도와드릴까요?' }],
    });

    // 대화 히스토리 추가 (최근 10개만)
    const recentHistory = history.slice(-10);
    recentHistory.forEach(msg => {
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

    // Gemini API 호출
    // API 키를 헤더로 전달하여 URL 노출 방지
    const response = await geminiModelRequest(
      'gemini-2.0-flash',
      'generateContent',
      apiKey,
      {
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = classifyError(
        new Error(errorData.error?.message || 'API 요청 실패'),
        response.status
      );
      return NextResponse.json({ success: false, error }, { status: response.status });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '응답을 받지 못했습니다.';

    // Citation 정보 추출
    const citations = candidate?.citationMetadata?.citationSources || [];

    // 확장된 하이라이트 마커 파싱 (12개 타겟)
    const highlightTargets = parseHighlightMarkersEnhanced(text);

    return NextResponse.json({
      success: true,
      answer: text,
      citations: citations.map((citation: CitationSource) => ({
        startIndex: citation.startIndex,
        endIndex: citation.endIndex,
        uri: citation.uri,
        license: citation.license,
      })),
      highlightTargets,
    });
  } catch (error) {
    console.error('Error in process-plan-chat:', error);
    const chatbotError = classifyError(error);
    return NextResponse.json({ success: false, error: chatbotError }, { status: 500 });
  }
}
