/**
 * Process Row Helper Functions
 *
 * 🎯 Stage 2 Task 4: Component Separation
 * These utilities extract helper logic from BuildingProcessPlanPage
 * to support the new component architecture.
 *
 * 📦 Functions:
 * - getCategoryLabel: Generate display label for process category
 * - getFloorNumberLabel: Generate display label for floor number
 * - getFormworkQuantity: Calculate formwork quantities (갱폼 + 알폼 + 형틀)
 * - getRebarQuantity: Calculate rebar quantities
 * - getConcreteQuantity: Calculate concrete quantities
 *
 * 💡 Usage:
 * These functions are used by ProcessCategoryRow to display quantities
 * from building.floorTrades data.
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
 * 형틀 물량 계산 (갱폼 + 알폼 + 형틀)
 */
export function getFormworkQuantity(row: ProcessRow, building: Building): number {
  // 버림, 기초는 tradeGroup으로 가져오기
  if (row.category === '버림' || row.category === '기초') {
    const trades = building.floorTrades.filter(ft => ft.tradeGroup === row.category);
    let total = 0;
    trades.forEach(trade => {
      const gangForm = trade.trades.gangForm?.areaM2 || 0;
      const alForm = trade.trades.alForm?.areaM2 || 0;
      const formwork = trade.trades.formwork?.areaM2 || 0;
      total += gangForm + alForm + formwork;
    });
    return total;
  }

  if (!row.floorLabel) return 0;

  // 기준층 범위 형식인 경우 row.floor.id를 rangeFloorId로 전달하여 정확한 범위 찾기
  const rangeFloorId = row.category === '기준층' && row.floor?.floorLabel?.includes('~')
    ? row.floor.id
    : undefined;

  // 옥탑층인 경우 원본 floorLabel 사용 (PH1, PH2, PH3 형식)
  const quantityFloorLabel = (row.category === '옥탑층' || row.category === 'PH층') && row.floor
    ? row.floor.floorLabel.replace(/코어\d+-/, '') // 코어 정보 제거
    : row.floorLabel;

  const gangForm = getQuantityFromFloor(building, quantityFloorLabel, 'gangForm', 'areaM2', rangeFloorId);
  const alForm = getQuantityFromFloor(building, quantityFloorLabel, 'alForm', 'areaM2', rangeFloorId);
  const formwork = getQuantityFromFloor(building, quantityFloorLabel, 'formwork', 'areaM2', rangeFloorId);

  return gangForm + alForm + formwork;
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

  if (!row.floorLabel) return 0;

  // 기준층 범위 형식인 경우 row.floor.id를 rangeFloorId로 전달하여 정확한 범위 찾기
  const rangeFloorId = row.category === '기준층' && row.floor?.floorLabel?.includes('~')
    ? row.floor.id
    : undefined;

  // 옥탑층인 경우 원본 floorLabel 사용 (PH1, PH2, PH3 형식)
  const quantityFloorLabel = (row.category === '옥탑층' || row.category === 'PH층') && row.floor
    ? row.floor.floorLabel.replace(/코어\d+-/, '') // 코어 정보 제거
    : row.floorLabel;

  return getQuantityFromFloor(building, quantityFloorLabel, 'rebar', 'ton', rangeFloorId);
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

  if (!row.floorLabel) return 0;

  // 기준층 범위 형식인 경우 row.floor.id를 rangeFloorId로 전달하여 정확한 범위 찾기
  const rangeFloorId = row.category === '기준층' && row.floor?.floorLabel?.includes('~')
    ? row.floor.id
    : undefined;

  // 옥탑층인 경우 원본 floorLabel 사용 (PH1, PH2, PH3 형식)
  const quantityFloorLabel = (row.category === '옥탑층' || row.category === 'PH층') && row.floor
    ? row.floor.floorLabel.replace(/코어\d+-/, '') // 코어 정보 제거
    : row.floorLabel;

  return getQuantityFromFloor(building, quantityFloorLabel, 'concrete', 'volumeM3', rangeFloorId);
}
