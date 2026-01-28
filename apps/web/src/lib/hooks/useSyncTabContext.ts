/**
 * 탭 컨텍스트 동기화 훅
 * BuildingProcessPlanPage에서 탭/공정계획 변경 시 Zustand 스토어 자동 업데이트
 */

import { useEffect } from 'react';
import type { Building, BuildingProcessPlan, ProcessCategory } from '@/lib/types';
import {
  useTabContextStore,
  type BuildingContext,
  type ProcessPlanContext,
} from '@/lib/stores/useTabContextStore';

const PROCESS_CATEGORIES: ProcessCategory[] = ['버림', '기초', '지하층', '셋팅층', '기준층', 'PH층', '옥탑층'];

interface UseSyncTabContextOptions {
  activeBuildingIndex: number;
  buildings: Building[];
  processPlans: Map<string, BuildingProcessPlan>;
  enabled?: boolean;
}

/**
 * 탭 컨텍스트를 Zustand 스토어와 동기화하는 훅
 */
export function useSyncTabContext({
  activeBuildingIndex,
  buildings,
  processPlans,
  enabled = true,
}: UseSyncTabContextOptions): void {
  const { setActiveTab, setBuildingContext, setProcessPlanContext, clearContext } =
    useTabContextStore();

  // 탭 변경 시 스토어 업데이트
  useEffect(() => {
    if (!enabled || buildings.length === 0) {
      clearContext();
      return;
    }

    const activeBuilding = buildings[activeBuildingIndex];
    if (!activeBuilding) {
      clearContext();
      return;
    }

    // 1. 탭 인덱스와 건물 ID 업데이트
    setActiveTab(activeBuildingIndex, activeBuilding.id);

    // 2. 건물 컨텍스트 업데이트
    const buildingContext: BuildingContext = {
      buildingId: activeBuilding.id,
      buildingName: activeBuilding.buildingName,
      totalUnits: activeBuilding.meta?.totalUnits || 0,
      coreCount: activeBuilding.meta?.coreCount || 1,
      floorCount: activeBuilding.floors?.length || 0,
      coreType: activeBuilding.meta?.coreType,
      slabType: activeBuilding.meta?.slabType,
    };
    setBuildingContext(buildingContext);

    // 3. 공정계획 컨텍스트 업데이트
    const processPlan = processPlans.get(activeBuilding.id);
    if (processPlan) {
      const processPlanContext = extractProcessPlanContext(processPlan);
      setProcessPlanContext(processPlanContext);
    } else {
      setProcessPlanContext(null);
    }
  }, [
    activeBuildingIndex,
    buildings,
    processPlans,
    enabled,
    setActiveTab,
    setBuildingContext,
    setProcessPlanContext,
    clearContext,
  ]);

  // 컴포넌트 언마운트 시 컨텍스트 정리
  useEffect(() => {
    return () => {
      clearContext();
    };
  }, [clearContext]);
}

/**
 * 공정계획에서 컨텍스트 정보 추출
 */
function extractProcessPlanContext(processPlan: BuildingProcessPlan): ProcessPlanContext {
  const selectedTypes: ProcessPlanContext['selectedTypes'] = {};
  const calculatedDays: ProcessPlanContext['calculatedDays'] = {};
  const errorMessages: string[] = [];

  let totalDays = 0;
  let hasSelectedType = false;
  let hasQuantity = false;
  let hasCalculation = false;
  let completedCategories = 0;
  let totalCategories = 0;

  for (const category of PROCESS_CATEGORIES) {
    const categoryPlan = processPlan.processes?.[category];
    if (!categoryPlan) continue;

    totalCategories++;

    // 타입 선택 상태
    selectedTypes[category] = categoryPlan.processType || null;
    if (categoryPlan.processType) {
      hasSelectedType = true;
    }

    // 일수 계산 상태
    const days = categoryPlan.days;
    calculatedDays[category] = days ?? null;
    if (days && days > 0) {
      hasCalculation = true;
      hasQuantity = true;
      totalDays += days;
      completedCategories++;
    }

    // 에러 메시지
    if (!categoryPlan.processType) {
      errorMessages.push(`${category} 공정 타입을 선택해주세요.`);
    }
  }

  // 현재 단계 결정
  let currentStep: ProcessPlanContext['currentStep'] = 'type_selection';
  if (hasCalculation) {
    currentStep = 'review';
  } else if (hasQuantity) {
    currentStep = 'calculation';
  } else if (hasSelectedType) {
    currentStep = 'quantity_input';
  }

  // 완성률 계산
  const completionRate = totalCategories > 0 ? Math.round((completedCategories / totalCategories) * 100) : 0;

  return {
    currentStep,
    selectedTypes,
    calculatedDays,
    totalDays,
    hasErrors: errorMessages.length > 0,
    errorMessages,
    completionRate,
  };
}
