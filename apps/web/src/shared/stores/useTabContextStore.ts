/**
 * 탭 컨텍스트 Zustand 스토어
 * 페이지 컴포넌트(BuildingProcessPlanPage)와 전역 챗봇(GlobalChatbot) 간 탭 상태 공유
 */

import { create } from 'zustand';
import type { ProcessCategory, ProcessType } from '@/shared/types';

/**
 * 건물 컨텍스트 정보
 */
export interface BuildingContext {
  buildingId: string;
  buildingName: string;
  totalUnits: number;
  coreCount: number;
  floorCount: number;
  coreType?: string;
  slabType?: string;
}

/**
 * 공정계획 컨텍스트 정보
 */
export interface ProcessPlanContext {
  currentStep: 'type_selection' | 'quantity_input' | 'calculation' | 'review';
  selectedTypes: Partial<Record<ProcessCategory, ProcessType | null>>;
  calculatedDays: Partial<Record<ProcessCategory, number | null>>;
  totalDays: number;
  hasErrors: boolean;
  errorMessages: string[];
  completionRate?: number;
}

/**
 * 탭 컨텍스트 상태
 */
interface TabContextState {
  // 상태
  activeTabIndex: number;
  activeBuildingId: string | null;
  buildingContext: BuildingContext | null;
  processPlanContext: ProcessPlanContext | null;

  // 액션
  setActiveTab: (index: number, buildingId: string | null) => void;
  setBuildingContext: (context: BuildingContext | null) => void;
  setProcessPlanContext: (context: ProcessPlanContext | null) => void;
  clearContext: () => void;
}

/**
 * 탭 컨텍스트 스토어
 */
export const useTabContextStore = create<TabContextState>((set) => ({
  // 초기 상태
  activeTabIndex: 0,
  activeBuildingId: null,
  buildingContext: null,
  processPlanContext: null,

  // 액션
  setActiveTab: (index, buildingId) =>
    set({
      activeTabIndex: index,
      activeBuildingId: buildingId,
    }),

  setBuildingContext: (context) =>
    set({
      buildingContext: context,
    }),

  setProcessPlanContext: (context) =>
    set({
      processPlanContext: context,
    }),

  clearContext: () =>
    set({
      activeTabIndex: 0,
      activeBuildingId: null,
      buildingContext: null,
      processPlanContext: null,
    }),
}));

/**
 * 현재 단계 한글 레이블
 */
export const STEP_LABELS: Record<ProcessPlanContext['currentStep'], string> = {
  type_selection: '공정 타입 선택',
  quantity_input: '물량 입력',
  calculation: '공정일수 계산',
  review: '검토',
};

/**
 * 탭 컨텍스트 선택자 (성능 최적화용)
 */
export const selectBuildingContext = (state: TabContextState) => state.buildingContext;
export const selectProcessPlanContext = (state: TabContextState) => state.processPlanContext;
export const selectActiveTabIndex = (state: TabContextState) => state.activeTabIndex;
export const selectActiveBuildingId = (state: TabContextState) => state.activeBuildingId;
