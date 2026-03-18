/**
 * 챗봇 컨텍스트 수집 및 구조화 유틸리티
 */

import type { BuildingProcessPlan, ProcessCategory, ProcessType } from '@/shared/types';
import type {
  ChatContextSnapshot,
  ProcessPlanChatContext,
  ValidationError,
  ValidationWarning,
} from '@/features/building/chatbot/ProcessPlanChatbotTypes';

const PROCESS_CATEGORIES: ProcessCategory[] = ['버림', '기초', '주동 지하층', '셋팅층', '기준층', '최상층', '옥탑층'];

/**
 * 현재 공정계획 상태에서 컨텍스트 스냅샷을 생성합니다.
 */
export function buildChatContext(
  context: ProcessPlanChatContext,
  additionalData?: {
    quantityData?: Map<string, Record<string, number>>;
    calculatedDays?: Map<ProcessCategory, number>;
  }
): ChatContextSnapshot {
  const { building, processPlan } = context;

  // 건물 정보
  const buildingInfo = building
    ? {
      name: building.buildingName,
      totalUnits: building.meta?.totalUnits,
      coreCount: building.meta?.coreCount,
      coreType: building.meta?.coreType,
      slabType: building.meta?.slabType,
      floorCount: building.floors?.length || 0,
    }
    : {};

  // 물량 요약
  const quantitySummary = extractQuantitySummary(processPlan, additionalData?.quantityData);

  // 공정계획 요약
  const processPlanSummary = extractProcessPlanSummary(processPlan, additionalData?.calculatedDays);

  // 유효성 검사 상태
  const validationState = extractValidationState(processPlan, quantitySummary);

  return {
    buildingInfo,
    quantitySummary,
    processPlanSummary,
    validationState,
  };
}

/**
 * 물량 요약 정보를 추출합니다.
 * Note: 실제 물량 데이터는 FloorTrade에서 관리되므로,
 * 여기서는 기본 구조만 반환합니다.
 */
function extractQuantitySummary(
  processPlan?: BuildingProcessPlan,
  quantityData?: Map<string, Record<string, number>>
): ChatContextSnapshot['quantitySummary'] {
  const missingFloors: string[] = [];
  let dataCount = 0;
  let expectedCount = 0;

  // quantityData가 제공된 경우 활용
  if (quantityData && quantityData.size > 0) {
    let totalFormwork = 0;
    let totalGangForm = 0;
    let totalAlForm = 0;
    let totalRebar = 0;
    let totalConcrete = 0;

    quantityData.forEach((data, key) => {
      expectedCount++;
      const hasData = Object.values(data).some(v => v > 0);
      if (hasData) {
        dataCount++;
        if (data.formwork) totalFormwork += data.formwork;
        if (data.gangForm) totalGangForm += data.gangForm;
        if (data.alForm) totalAlForm += data.alForm;
        if (data.rebar) totalRebar += data.rebar;
        if (data.concrete) totalConcrete += data.concrete;
      } else {
        missingFloors.push(key);
      }
    });

    const completionRate = expectedCount > 0 ? Math.round((dataCount / expectedCount) * 100) : 0;

    return {
      totalFormwork: totalFormwork || undefined,
      totalGangForm: totalGangForm || undefined,
      totalAlForm: totalAlForm || undefined,
      totalRebar: totalRebar || undefined,
      totalConcrete: totalConcrete || undefined,
      missingFloors,
      completionRate,
    };
  }

  // processPlan에서 기본 정보만 추출
  if (processPlan?.processes) {
    for (const category of PROCESS_CATEGORIES) {
      const categoryPlan = processPlan.processes[category];
      if (categoryPlan) {
        expectedCount++;
        if (categoryPlan.days && categoryPlan.days > 0) {
          dataCount++;
        }
      }
    }
  }

  const completionRate = expectedCount > 0 ? Math.round((dataCount / expectedCount) * 100) : 0;

  return {
    missingFloors,
    completionRate,
  };
}

/**
 * 공정계획 요약 정보를 추출합니다.
 */
function extractProcessPlanSummary(
  processPlan?: BuildingProcessPlan,
  calculatedDays?: Map<ProcessCategory, number>
): ChatContextSnapshot['processPlanSummary'] {
  const selectedTypes: Record<ProcessCategory, ProcessType | null> = {
    '버림': null,
    '기초': null,
    '주동 지하층': null,
    '지하층(층고6.5m이상)': null,
    '셋팅층': null,
    '기준층': null,
    '최상층': null,
    '옥탑층': null,
    '지하주차장': null,
    '일반층': null,
  };

  const calculatedDaysRecord: Record<ProcessCategory, number | null> = {
    '버림': null,
    '기초': null,
    '주동 지하층': null,
    '지하층(층고6.5m이상)': null,
    '셋팅층': null,
    '기준층': null,
    '최상층': null,
    '옥탑층': null,
    '지하주차장': null,
    '일반층': null,
  };

  let totalDays = 0;

  if (processPlan?.processes) {
    for (const category of PROCESS_CATEGORIES) {
      const categoryPlan = processPlan.processes[category];
      if (categoryPlan) {
        selectedTypes[category] = categoryPlan.processType || null;

        // 계산된 일수 가져오기
        const days = calculatedDays?.get(category) ?? categoryPlan.days ?? null;
        calculatedDaysRecord[category] = days;

        if (days) {
          totalDays += days;
        }
      }
    }
  }

  return {
    selectedTypes,
    calculatedDays: calculatedDaysRecord,
    totalDays: totalDays > 0 ? totalDays : undefined,
  };
}

/**
 * 유효성 검사 상태를 추출합니다.
 */
function extractValidationState(
  processPlan?: BuildingProcessPlan,
  quantitySummary?: ChatContextSnapshot['quantitySummary']
): ChatContextSnapshot['validationState'] {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let currentStep: ChatContextSnapshot['validationState']['currentStep'] = 'type_selection';

  if (!processPlan?.processes) {
    return { errors, warnings, currentStep };
  }

  // 공정 타입 선택 확인
  let hasSelectedType = false;
  let hasQuantity = false;
  let hasCalculation = false;

  for (const category of PROCESS_CATEGORIES) {
    const categoryPlan = processPlan.processes[category];
    if (!categoryPlan) continue;

    // 타입 선택 확인
    if (categoryPlan.processType) {
      hasSelectedType = true;
    } else {
      errors.push({
        field: 'processType',
        message: `${category} 공정 타입을 선택해주세요.`,
        category,
      });
    }

    // 물량 입력은 quantitySummary에서 확인
    // (실제 물량은 FloorTrade에서 관리됨)

    // 계산 결과 확인
    if (categoryPlan.days && categoryPlan.days > 0) {
      hasCalculation = true;
      hasQuantity = true; // 일수가 계산되었으면 물량도 입력되었다고 가정
    }
  }

  // 물량 누락 경고
  if (quantitySummary?.missingFloors && quantitySummary.missingFloors.length > 0) {
    warnings.push({
      field: 'quantity',
      message: `물량 데이터가 누락된 항목이 있습니다: ${quantitySummary.missingFloors.slice(0, 3).join(', ')}${quantitySummary.missingFloors.length > 3 ? ` 외 ${quantitySummary.missingFloors.length - 3}개` : ''}`,
      suggestion: '물량 참조 버튼을 눌러 물량 데이터를 자동으로 가져올 수 있습니다.',
    });
  }

  // 완성도 경고
  if (quantitySummary?.completionRate && quantitySummary.completionRate < 50) {
    warnings.push({
      field: 'completion',
      message: `물량 입력 완성도가 ${quantitySummary.completionRate}%입니다.`,
      suggestion: '모든 공종의 물량을 입력하면 더 정확한 공정일수를 계산할 수 있습니다.',
    });
  }

  // 현재 단계 결정
  if (hasCalculation) {
    currentStep = 'review';
  } else if (hasQuantity) {
    currentStep = 'calculation';
  } else if (hasSelectedType) {
    currentStep = 'quantity_input';
  }

  return { errors, warnings, currentStep };
}

/**
 * 컨텍스트 스냅샷을 프롬프트 문자열로 변환합니다.
 */
export function contextToPromptString(snapshot: ChatContextSnapshot): string {
  const lines: string[] = [];

  // 건물 정보
  if (Object.keys(snapshot.buildingInfo).length > 0) {
    lines.push('## 현재 동 정보');
    if (snapshot.buildingInfo.name) lines.push(`- 동명: ${snapshot.buildingInfo.name}`);
    if (snapshot.buildingInfo.totalUnits) lines.push(`- 세대수: ${snapshot.buildingInfo.totalUnits}세대`);
    if (snapshot.buildingInfo.coreCount) lines.push(`- 코어 수: ${snapshot.buildingInfo.coreCount}개`);
    if (snapshot.buildingInfo.coreType) lines.push(`- 코어 타입: ${snapshot.buildingInfo.coreType}`);
    if (snapshot.buildingInfo.slabType) lines.push(`- 슬라브 타입: ${snapshot.buildingInfo.slabType}`);
    if (snapshot.buildingInfo.floorCount) lines.push(`- 층수: ${snapshot.buildingInfo.floorCount}개층`);
    lines.push('');
  }

  // 물량 요약
  lines.push('## 물량 현황');
  if (snapshot.quantitySummary.totalFormwork) {
    lines.push(`- 총 형틀: ${snapshot.quantitySummary.totalFormwork.toLocaleString()}㎡`);
  }
  if (snapshot.quantitySummary.totalGangForm) {
    lines.push(`  - 갱폼(벽체): ${snapshot.quantitySummary.totalGangForm.toLocaleString()}㎡`);
  }
  if (snapshot.quantitySummary.totalAlForm) {
    lines.push(`  - 알폼(슬라브): ${snapshot.quantitySummary.totalAlForm.toLocaleString()}㎡`);
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
  lines.push('');

  // 공정계획 요약
  lines.push('## 공정계획 현황');
  for (const category of PROCESS_CATEGORIES) {
    const type = snapshot.processPlanSummary.selectedTypes[category];
    const days = snapshot.processPlanSummary.calculatedDays[category];
    if (type || days) {
      lines.push(`- ${category}: ${type || '미선택'} / ${days ? `${days}일` : '미계산'}`);
    }
  }
  if (snapshot.processPlanSummary.totalDays) {
    lines.push(`- **총 공정일수: ${snapshot.processPlanSummary.totalDays}일**`);
  }
  lines.push('');

  // 현재 단계
  const stepLabels: Record<ChatContextSnapshot['validationState']['currentStep'], string> = {
    type_selection: '공정 타입 선택 단계',
    quantity_input: '물량 입력 단계',
    calculation: '공정일수 계산 단계',
    review: '검토 단계',
  };
  lines.push(`## 현재 단계: ${stepLabels[snapshot.validationState.currentStep]}`);

  // 에러 및 경고
  if (snapshot.validationState.errors.length > 0) {
    lines.push('');
    lines.push('## 오류');
    snapshot.validationState.errors.forEach(err => {
      lines.push(`- ❌ ${err.message}`);
    });
  }

  if (snapshot.validationState.warnings.length > 0) {
    lines.push('');
    lines.push('## 주의사항');
    snapshot.validationState.warnings.forEach(warn => {
      lines.push(`- ⚠️ ${warn.message}`);
      if (warn.suggestion) {
        lines.push(`  💡 ${warn.suggestion}`);
      }
    });
  }

  return lines.join('\n');
}

/**
 * 간단한 컨텍스트 요약 (짧은 프롬프트용)
 */
export function contextToShortSummary(snapshot: ChatContextSnapshot): string {
  const parts: string[] = [];

  if (snapshot.buildingInfo.name) {
    parts.push(`동: ${snapshot.buildingInfo.name}`);
  }

  if (snapshot.processPlanSummary.totalDays) {
    parts.push(`총 ${snapshot.processPlanSummary.totalDays}일`);
  }

  if (snapshot.quantitySummary.completionRate !== undefined) {
    parts.push(`완성도 ${snapshot.quantitySummary.completionRate}%`);
  }

  const stepLabels: Record<ChatContextSnapshot['validationState']['currentStep'], string> = {
    type_selection: '타입 선택 중',
    quantity_input: '물량 입력 중',
    calculation: '계산 중',
    review: '검토 중',
  };
  parts.push(stepLabels[snapshot.validationState.currentStep]);

  return parts.join(' | ');
}
