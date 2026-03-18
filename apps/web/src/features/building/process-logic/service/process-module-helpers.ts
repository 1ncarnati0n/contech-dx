import type { ProcessItem } from '@/features/building/data/process-modules';
import type { ProcessCategory } from '@/shared/types';
import type { SemanticQuantityReference } from '@/shared/types/process-quantity';

// ============================================
// 계산 방식 판별
// ============================================

export type CalculationMethod = 'fixed' | 'quantity-based' | 'equipment-based';

export function getCalculationMethod(item: ProcessItem): CalculationMethod {
  if (item.directWorkDays !== undefined && item.directWorkDays > 0) {
    return 'fixed';
  }
  if (item.equipmentCalculationBase !== undefined &&
      item.equipmentWorkersPerUnit !== undefined) {
    return 'equipment-based';
  }
  return 'quantity-based';
}

export function getCalculationMethodConfig(method: CalculationMethod) {
  const configs = {
    fixed: {
      variant: 'info' as const,
      label: '일수고정',
    },
    'quantity-based': {
      variant: 'success' as const,
      label: '물량계산',
    },
    'equipment-based': {
      variant: 'warning' as const,
      label: '장비기반',
    },
  };
  return configs[method];
}

export function getCalculationSteps(method: CalculationMethod, item: ProcessItem): string[] {
  switch (method) {
    case 'fixed':
      return [
        '1. 순작업일: 고정값 사용',
        '2. 총투입인원 = CEILING(수량 / 인당생산성)',
        '3. 1일투입인원 = ROUNDUP(총투입인원 / 순작업일)',
      ];
    case 'equipment-based':
      return [
        '1. 장비대수 = CEILING(MIN(최대값, 수량/대당타설량))',
        `2. 1일투입인원 = 장비대수 × ${item.equipmentWorkersPerUnit || 4}명`,
        '3. 순작업일 = ROUND(수량 / (인당생산성 × 1일투입인원))',
        '4. 총투입인원 = 1일투입인원 × 순작업일',
      ];
    case 'quantity-based':
      return [
        '1. 총투입인원 = CEILING(수량 / 인당생산성)',
        '2. 1일투입인원 = CEILING(총투입인원 / 장비대수)',
        '3. 순작업일 = ROUND(수량 / (인당생산성 × 1일투입인원))',
      ];
  }
}

// ============================================
// 시맨틱 참조 기반 표시
// ============================================

const TRADE_FIELD_NAMES: Record<string, string> = {
  gangForm: '갱폼', alForm: '알폼', formwork: '형틀',
  euroForm: '유로폼', stripClean: '해체/정리', rebar: '철근', concrete: '콘크리트',
};

const SUB_FIELD_UNITS: Record<string, string> = {
  areaM2: '㎡', ton: 'ton', volumeM3: '㎥',
};

export function getSemanticReferenceDisplay(
  quantityRef?: SemanticQuantityReference,
  legacyRef?: string
): { badge: string; tooltip: string } {
  if (quantityRef) {
    const fieldName = TRADE_FIELD_NAMES[quantityRef.tradeField] || quantityRef.tradeField;
    const unit = SUB_FIELD_UNITS[quantityRef.subField] || '';
    const ratioStr = quantityRef.ratio !== 1 ? ` ×${quantityRef.ratio}` : '';

    if (quantityRef.sourceType === 'category' && quantityRef.tradeGroup) {
      return {
        badge: `${quantityRef.tradeGroup} ${fieldName}`,
        tooltip: `공종 참조: ${quantityRef.tradeGroup} ${fieldName}(${unit})${ratioStr}`,
      };
    }
    if (quantityRef.sourceType === 'combined' && quantityRef.combineFloors) {
      return {
        badge: `${quantityRef.combineFloors.join('+')} ${fieldName}`,
        tooltip: `공종 참조: ${quantityRef.combineFloors.join('+')} 합산 ${fieldName}(${unit})${ratioStr}`,
      };
    }
    return {
      badge: `${fieldName}`,
      tooltip: `공종 참조: ${fieldName}(${unit})${ratioStr}`,
    };
  }

  if (legacyRef) {
    const match = legacyRef.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
    if (match) {
      const [, col, row, ratio] = match;
      const rowNum = parseInt(row, 10);
      const colNames: Record<string, string> = { B: '갱폼', C: '알폼', D: '형틀', E: '해체/정리', F: '철근', G: '콘크리트' };
      let rowName = '';
      if (rowNum === 6) rowName = '버림';
      else if (rowNum === 7) rowName = '기초';
      else if (rowNum === 8) rowName = 'B2';
      else if (rowNum === 9) rowName = 'B1';
      else if (rowNum >= 11 && rowNum <= 25) rowName = `${rowNum - 10}F`;
      else if (rowNum === 26) rowName = 'PH1';
      else if (rowNum === 27) rowName = 'PH2';
      else if (rowNum === 28) rowName = 'PH3';
      const colName = colNames[col] || col;
      const ratioStr = ratio ? ` ×${ratio}` : '';
      const prefix = rowName ? `${rowName} ` : '';
      return {
        badge: `${prefix}${colName}`,
        tooltip: `공종 참조: ${prefix}${colName}${ratioStr}`,
      };
    }
  }

  return { badge: legacyRef || '-', tooltip: legacyRef || '-' };
}

// ============================================
// 장비 기준값 관련
// ============================================

const DEFAULT_EQUIPMENT_BASES: Record<ProcessCategory, number> = {
  '버림': 650,
  '기초': 650,
  '주동 지하층': 500,
  '지하층(층고6.5m이상)': 500,
  '셋팅층': 400,
  '기준층': 320,
  '최상층': 230,
  '옥탑층': 230,
  '지하주차장': 500,
  '일반층': 200,
};

export function getDefaultEquipmentBase(category: ProcessCategory): number {
  return DEFAULT_EQUIPMENT_BASES[category];
}

export function getAllDefaultEquipmentBases(): Record<ProcessCategory, number> {
  return { ...DEFAULT_EQUIPMENT_BASES };
}
