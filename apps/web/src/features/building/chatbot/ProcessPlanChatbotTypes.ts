/**
 * 공정계획 도우미 챗봇 타입 정의
 */

import type { Building, BuildingProcessPlan, ProcessType, ProcessCategory } from '@/shared/types';
import type { SearchCitation } from '@/shared/types';

/**
 * 챗봇 메시지 타입
 */
export interface ProcessPlanMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  citations?: SearchCitation[];
  timestamp: Date;
  highlightTargets?: HighlightTarget[];
  error?: ChatbotError;
}

/**
 * 하이라이트 타겟
 */
export interface HighlightTarget {
  id: string;
  selector: string;
  label: string;
  description?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  category?: 'navigation' | 'input' | 'result' | 'action';
}

/**
 * 하이라이트 타겟 키 (레지스트리 사용)
 */
export type HighlightTargetKey =
  | 'processTypeSelector'
  | 'quantityInput'
  | 'processDaysResult'
  | 'buildingTabs'
  | 'detailProcessTable'
  | 'saveButton'
  | 'floorSettings'
  | 'pumpCarSettings'
  | 'categoryExpand'
  | 'totalProcessDays'
  | 'standardCycle'
  | 'quantityTable';

/**
 * 챗봇 에러 타입
 */
export type ChatbotErrorType =
  | 'NETWORK_ERROR'
  | 'API_RATE_LIMIT'
  | 'API_OVERLOADED'
  | 'INVALID_RESPONSE'
  | 'CONTEXT_TOO_LARGE'
  | 'TIMEOUT'
  | 'UNKNOWN';

/**
 * 챗봇 에러
 */
export interface ChatbotError {
  type: ChatbotErrorType;
  message: string;
  retryable: boolean;
  retryAfter?: number;
}

/**
 * 챗봇 컨텍스트 (확장됨)
 */
export interface ProcessPlanChatContext {
  page: 'building' | 'basement';
  buildingId?: string;
  projectId: string;
  building?: Building;
  processPlan?: BuildingProcessPlan;
  selectedProcessType?: ProcessType;
}

/**
 * 컨텍스트 스냅샷 (AI에게 전달)
 */
export interface ChatContextSnapshot {
  buildingInfo: {
    name?: string;
    totalUnits?: number;
    coreCount?: number;
    coreType?: string;
    slabType?: string;
    floorCount?: number;
  };
  quantitySummary: {
    totalFormwork?: number;
    totalGangForm?: number;
    totalAlForm?: number;
    totalRebar?: number;
    totalConcrete?: number;
    missingFloors: string[];
    completionRate?: number;
  };
  processPlanSummary: {
    selectedTypes: Record<ProcessCategory, ProcessType | null>;
    calculatedDays: Record<ProcessCategory, number | null>;
    totalDays?: number;
  };
  validationState: {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    currentStep: 'type_selection' | 'quantity_input' | 'calculation' | 'review';
  };
}

/**
 * 유효성 검사 에러
 */
export interface ValidationError {
  field: string;
  message: string;
  category?: ProcessCategory;
}

/**
 * 유효성 검사 경고
 */
export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * 빠른 질문 카테고리
 */
export type QuickQuestionCategory = 'basic' | 'calculation' | 'error' | 'glossary';

/**
 * 빠른 질문
 */
export interface QuickQuestion {
  id: string;
  category: QuickQuestionCategory;
  question: string;
  description?: string;
  highlightTargets?: HighlightTargetKey[];
}

/**
 * 챗봇 API 요청
 */
export interface ProcessPlanChatRequest {
  query: string;
  context: ProcessPlanChatContext;
  contextSnapshot?: ChatContextSnapshot;
  history?: Array<{
    role: 'user' | 'model';
    content: string;
  }>;
}

/**
 * 챗봇 API 응답
 */
export interface ProcessPlanChatResponse {
  success: boolean;
  answer?: string;
  citations?: SearchCitation[];
  highlightTargets?: HighlightTarget[];
  error?: ChatbotError;
}

/**
 * 챗봇 상태
 */
export interface ChatbotState {
  isOpen: boolean;
  isLoading: boolean;
  messages: ProcessPlanMessage[];
  error: ChatbotError | null;
  retryCount: number;
  activeHighlights: HighlightTarget[];
}
