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
import { getQuantityFromFloor } from '@/lib/utils/quantity-reference';

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
  // 버림, 기초는 tradeGroup으로 가져오기
  if (row.category === '버림' || row.category === '기초') {
    const trades = building.floorTrades.filter(ft => ft.tradeGroup === row.category);
    let total = 0;
    trades.forEach(trade => {
      const gangForm = trade.trades.gangForm?.areaM2 || 0;
      const alForm = trade.trades.alForm?.areaM2 || 0;
      const euroForm = trade.trades.euroForm?.areaM2 || 0;
      total += gangForm + alForm + euroForm;
    });
    return total;
  }

  const params = resolveFloorParams(row);
  if (!params) return 0;

  const gangForm = getQuantityFromFloor(building, params.quantityFloorLabel, 'gangForm', 'areaM2', params.rangeFloorId);
  const alForm = getQuantityFromFloor(building, params.quantityFloorLabel, 'alForm', 'areaM2', params.rangeFloorId);
  const euroForm = getQuantityFromFloor(building, params.quantityFloorLabel, 'euroForm', 'areaM2', params.rangeFloorId);

  return gangForm + alForm + euroForm;
}

/**
 * 갱폼 물량 계산
 */
export function getGangFormQuantity(row: ProcessRow, building: Building): number {
  if (row.category === '버림' || row.category === '기초') {
    const trades = building.floorTrades.filter(ft => ft.tradeGroup === row.category);
    let total = 0;
    trades.forEach(trade => {
      total += trade.trades.gangForm?.areaM2 || 0;
    });
    return total;
  }

  const params = resolveFloorParams(row);
  if (!params) return 0;

  return getQuantityFromFloor(building, params.quantityFloorLabel, 'gangForm', 'areaM2', params.rangeFloorId);
}

/**
 * 알폼 물량 계산
 */
export function getAlFormQuantity(row: ProcessRow, building: Building): number {
  if (row.category === '버림' || row.category === '기초') {
    const trades = building.floorTrades.filter(ft => ft.tradeGroup === row.category);
    let total = 0;
    trades.forEach(trade => {
      total += trade.trades.alForm?.areaM2 || 0;
    });
    return total;
  }

  const params = resolveFloorParams(row);
  if (!params) return 0;

  return getQuantityFromFloor(building, params.quantityFloorLabel, 'alForm', 'areaM2', params.rangeFloorId);
}

/**
 * 유로폼 물량 계산
 */
export function getEuroFormQuantity(row: ProcessRow, building: Building): number {
  if (row.category === '버림' || row.category === '기초') {
    const trades = building.floorTrades.filter(ft => ft.tradeGroup === row.category);
    let total = 0;
    trades.forEach(trade => {
      total += trade.trades.euroForm?.areaM2 || 0;
    });
    return total;
  }

  const params = resolveFloorParams(row);
  if (!params) return 0;

  return getQuantityFromFloor(building, params.quantityFloorLabel, 'euroForm', 'areaM2', params.rangeFloorId);
}

/**
 * 해체/정리 물량 계산 (유로폼 × 2)
 */
export function getStripCleanQuantity(row: ProcessRow, building: Building): number {
  return getEuroFormQuantity(row, building) * 2;
}

/**
 * 철근 물량 계산
 */
export function getRebarQuantity(row: ProcessRow, building: Building): number {
  // 버림, 기초는 tradeGroup으로 가져오기
  if (row.category === '버림' || row.category === '기초') {
    const trades = building.floorTrades.filter(ft => ft.tradeGroup === row.category);
    let total = 0;
    trades.forEach(trade => {
      total += trade.trades.rebar?.ton || 0;
    });
    return total;
  }

  const params = resolveFloorParams(row);
  if (!params) return 0;

  return getQuantityFromFloor(building, params.quantityFloorLabel, 'rebar', 'ton', params.rangeFloorId);
}

/**
 * 콘크리트 물량 계산
 */
export function getConcreteQuantity(row: ProcessRow, building: Building): number {
  // 버림, 기초는 tradeGroup으로 가져오기
  if (row.category === '버림' || row.category === '기초') {
    const trades = building.floorTrades.filter(ft => ft.tradeGroup === row.category);
    let total = 0;
    trades.forEach(trade => {
      total += trade.trades.concrete?.volumeM3 || 0;
    });
    return total;
  }

  const params = resolveFloorParams(row);
  if (!params) return 0;

  return getQuantityFromFloor(building, params.quantityFloorLabel, 'concrete', 'volumeM3', params.rangeFloorId);
}
