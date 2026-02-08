/**
 * Process Row Helper Functions
 *
 * Functions:
 * - getCategoryLabel: Generate display label for process category
 * - getFloorNumberLabel: Generate display label for floor number
 * - getFormworkQuantity: Calculate formwork total (갱폼 + 알폼 + 유로폼)
 * - getGangFormQuantity: Calculate 갱폼 quantity
 * - getAlFormQuantity: Calculate 알폼 quantity
 * - getEuroFormQuantity: Calculate 유로폼 quantity
 * - getStripCleanQuantity: Calculate 해체/정리 quantity (유로폼 × 2)
 * - getRebarQuantity: Calculate rebar quantities
 * - getConcreteQuantity: Calculate concrete quantities
 */

import type { Building, ProcessCategory, Floor } from '@/lib/types';
import { resolveProcessQuantity } from '@/lib/utils/process-quantity-resolver';

/**
 * ProcessRow type definition
 * (Local type - matches the structure used in BuildingProcessPlanPage)
 */
export interface ProcessRow {
  category: ProcessCategory;
  floorLabel?: string;
  floor?: Floor;
  floorClass?: string;
  rowIndex: number;
}

/**
 * 구분 항목 표시 레이블 생성
 */
export function getCategoryLabel(row: ProcessRow): string {
  if (row.category === '버림' || row.category === '기초') {
    return row.category;
  }

  // 지하층인 경우 "지하층" 표시
  if (row.category === '주동 지하층') {
    return '주동 지하층';
  }

  // 옥탑층인 경우 "옥탑층" 표시
  if (row.category === '옥탑층') {
    return '옥탑층';
  }

  // 기준층인 경우 "기준층" 표시
  if (row.category === '기준층') {
    return '기준층';
  }

  // 셋팅층 또는 일반층인 경우 층 분류 표시
  if (row.floorClass === '셋팅층') {
    return '셋팅층';
  }

  if (row.floorClass === '일반층') {
    return '일반층';
  }

  return row.floorClass || '';
}

/**
 * 층수 표시 레이블 생성
 */
export function getFloorNumberLabel(row: ProcessRow): string {
  // 버림, 기초는 층수 없음
  if (row.category === '버림' || row.category === '기초') {
    return '';
  }

  // 기준층인 경우 개별 층 표시 (예: "2F", "3F")
  if (row.category === '기준층' && row.floorLabel) {
    return row.floorLabel;
  }

  // 나머지는 floorLabel 표시 (B2, B1, 1F, 옥탑1 등)
  return row.floorLabel || '';
}

/**
 * 층 물량 조회를 위한 공통 파라미터 해석
 * rangeFloorId와 quantityFloorLabel을 산출
 */
function resolveFloorParams(row: ProcessRow): { quantityFloorLabel: string; rangeFloorId: string | undefined } | null {
  if (!row.floorLabel) return null;

  const rangeFloorId = row.category === '기준층' && row.floor?.floorLabel?.includes('~')
    ? row.floor.id
    : undefined;

  const quantityFloorLabel = (row.category === '옥탑층' || row.category === 'PH층') && row.floor
    ? row.floor.floorLabel.replace(/코어\d+-/, '')
    : row.floorLabel;

  return { quantityFloorLabel, rangeFloorId };
}

/**
 * 형틀 합계 물량 계산 (갱폼 + 알폼 + 유로폼)
 */
export function getFormworkQuantity(row: ProcessRow, building: Building): number {
  if (row.category === '버림' || row.category === '기초') {
    const catRef = { subField: 'areaM2' as const, ratio: 1, sourceType: 'category' as const, tradeGroup: row.category };
    const gangForm = resolveProcessQuantity(building, { ...catRef, tradeField: 'gangForm' });
    const alForm = resolveProcessQuantity(building, { ...catRef, tradeField: 'alForm' });
    const euroForm = resolveProcessQuantity(building, { ...catRef, tradeField: 'euroForm' });
    return gangForm + alForm + euroForm;
  }

  const params = resolveFloorParams(row);
  if (!params) return 0;

  const floorRef = { subField: 'areaM2' as const, ratio: 1, sourceType: 'floor' as const };
  const gangForm = resolveProcessQuantity(building, { ...floorRef, tradeField: 'gangForm' }, params.quantityFloorLabel, params.rangeFloorId);
  const alForm = resolveProcessQuantity(building, { ...floorRef, tradeField: 'alForm' }, params.quantityFloorLabel, params.rangeFloorId);
  const euroForm = resolveProcessQuantity(building, { ...floorRef, tradeField: 'euroForm' }, params.quantityFloorLabel, params.rangeFloorId);

  return gangForm + alForm + euroForm;
}

/**
 * 갱폼 물량 계산
 */
export function getGangFormQuantity(row: ProcessRow, building: Building): number {
  if (row.category === '버림' || row.category === '기초') {
    return resolveProcessQuantity(building, {
      tradeField: 'gangForm', subField: 'areaM2', ratio: 1,
      sourceType: 'category', tradeGroup: row.category,
    });
  }

  const params = resolveFloorParams(row);
  if (!params) return 0;

  return resolveProcessQuantity(building, {
    tradeField: 'gangForm', subField: 'areaM2', ratio: 1, sourceType: 'floor',
  }, params.quantityFloorLabel, params.rangeFloorId);
}

/**
 * 알폼 물량 계산
 */
export function getAlFormQuantity(row: ProcessRow, building: Building): number {
  if (row.category === '버림' || row.category === '기초') {
    return resolveProcessQuantity(building, {
      tradeField: 'alForm', subField: 'areaM2', ratio: 1,
      sourceType: 'category', tradeGroup: row.category,
    });
  }

  const params = resolveFloorParams(row);
  if (!params) return 0;

  return resolveProcessQuantity(building, {
    tradeField: 'alForm', subField: 'areaM2', ratio: 1, sourceType: 'floor',
  }, params.quantityFloorLabel, params.rangeFloorId);
}

/**
 * 유로폼 물량 계산
 */
export function getEuroFormQuantity(row: ProcessRow, building: Building): number {
  if (row.category === '버림' || row.category === '기초') {
    return resolveProcessQuantity(building, {
      tradeField: 'euroForm', subField: 'areaM2', ratio: 1,
      sourceType: 'category', tradeGroup: row.category,
    });
  }

  const params = resolveFloorParams(row);
  if (!params) return 0;

  return resolveProcessQuantity(building, {
    tradeField: 'euroForm', subField: 'areaM2', ratio: 1, sourceType: 'floor',
  }, params.quantityFloorLabel, params.rangeFloorId);
}

/**
 * 해체/정리 물량 계산 (형틀합계 × 2)
 */
export function getStripCleanQuantity(row: ProcessRow, building: Building): number {
  return getFormworkQuantity(row, building) * 2;
}

/**
 * 철근 물량 계산
 */
export function getRebarQuantity(row: ProcessRow, building: Building): number {
  if (row.category === '버림' || row.category === '기초') {
    return resolveProcessQuantity(building, {
      tradeField: 'rebar', subField: 'ton', ratio: 1,
      sourceType: 'category', tradeGroup: row.category,
    });
  }

  const params = resolveFloorParams(row);
  if (!params) return 0;

  return resolveProcessQuantity(building, {
    tradeField: 'rebar', subField: 'ton', ratio: 1, sourceType: 'floor',
  }, params.quantityFloorLabel, params.rangeFloorId);
}

/**
 * 콘크리트 물량 계산
 */
export function getConcreteQuantity(row: ProcessRow, building: Building): number {
  if (row.category === '버림' || row.category === '기초') {
    return resolveProcessQuantity(building, {
      tradeField: 'concrete', subField: 'volumeM3', ratio: 1,
      sourceType: 'category', tradeGroup: row.category,
    });
  }

  const params = resolveFloorParams(row);
  if (!params) return 0;

  return resolveProcessQuantity(building, {
    tradeField: 'concrete', subField: 'volumeM3', ratio: 1, sourceType: 'floor',
  }, params.quantityFloorLabel, params.rangeFloorId);
}
