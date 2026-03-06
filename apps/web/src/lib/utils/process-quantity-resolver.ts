/**
 * 공정 항목의 물량을 해석하는 단일 진입점
 *
 * 물량입력 데이터(building.floorTrades)에서 SemanticQuantityReference를 통해
 * 수량을 가져옵니다. 기존의 Excel 셀 주소 기반 해석을 대체합니다.
 *
 * 해석 전략:
 * - category: tradeGroup으로 필터링하여 해당 필드 합산
 * - floor:    getQuantityFromFloor로 특정 층의 물량을 직접 조회
 * - combined: combineFloors의 각 층 물량을 합산
 */

import type { Building } from '@/lib/types';
import type { SemanticQuantityReference } from '@/lib/types/process-quantity';
import { getQuantityFromFloor } from './quantity-reference';
import { getQuantityValue } from './tradeDataHelpers';

/**
 * SemanticQuantityReference를 사용하여 물량을 해석
 *
 * @param building - 동 정보 (floors, floorTrades 포함)
 * @param ref - 의미론적 물량 참조
 * @param floorLabel - 층 라벨 (sourceType='floor'일 때 필수)
 * @param rangeFloorId - 범위 형식 기준층의 floor.id (예: "2~14F 기준층"에서 개별 층 조회 시)
 * @returns 해석된 물량 (ratio 적용 후)
 */
export function resolveProcessQuantity(
  building: Building,
  ref: SemanticQuantityReference,
  floorLabel?: string,
  rangeFloorId?: string
): number {
  let baseQuantity = 0;

  switch (ref.sourceType) {
    case 'category':
      baseQuantity = resolveByCategory(building, ref);
      break;

    case 'floor':
      baseQuantity = resolveByFloor(building, ref, floorLabel, rangeFloorId);
      break;

    case 'combined':
      baseQuantity = resolveByCombined(building, ref);
      break;
  }

  return baseQuantity * ref.ratio;
}

/**
 * category 소스 타입: tradeGroup으로 필터링하여 합산
 * 버림, 기초 등 특정 구분의 전체 물량을 가져옴
 */
function resolveByCategory(
  building: Building,
  ref: SemanticQuantityReference
): number {
  if (!ref.tradeGroup) return 0;

  const trades = building.floorTrades.filter(ft => ft.tradeGroup === ref.tradeGroup);
  let total = 0;

  for (const trade of trades) {
    const tradeData = trade.trades[ref.tradeField];
    if (tradeData) {
      total += getQuantityValue(tradeData, ref.subField);
    } else if (ref.tradeField === 'stripClean' && ref.subField === 'areaM2') {
      // stripClean(해체/정리)은 DB에 저장되지 않는 파생값: 형틀합계(gangForm + alForm + euroForm) × 2
      const gangForm = getQuantityValue(trade.trades['gangForm'] || {}, 'areaM2');
      const alForm = getQuantityValue(trade.trades['alForm'] || {}, 'areaM2');
      const euroForm = getQuantityValue(trade.trades['euroForm'] || {}, 'areaM2');
      const formworkTotal = gangForm + alForm + euroForm;
      if (formworkTotal > 0) {
        total += formworkTotal * 2;
      }
    }
  }

  return total;
}

/** 차감 필드 타입 */
export interface DeductionFields {
  gangForm: number;
  alForm: number;
  formwork: number;
  rebar: number;
  concrete: number;
}

/**
 * 특수 행(주차장/가시설/6.5m이상) 차감 합계 계산
 *
 * 주동 지하층의 전체 물량에서 차감할 특수 행 물량을 합산합니다.
 */
export function getSpecialRowDeductions(
  specialRowQuantities: Record<string, Record<string, number>> | undefined,
  floorLabel: string
): DeductionFields {
  const zero: DeductionFields = { gangForm: 0, alForm: 0, formwork: 0, rebar: 0, concrete: 0 };
  if (!specialRowQuantities) return zero;

  const keys = [
    `${floorLabel} 주차장`,
    `${floorLabel} 3단 가시설 적용부`,
    `${floorLabel} 6.5m이상`,
  ];

  const result: DeductionFields = { gangForm: 0, alForm: 0, formwork: 0, rebar: 0, concrete: 0 };
  for (const key of keys) {
    const qty = specialRowQuantities[key];
    if (!qty) continue;
    result.gangForm += qty.gangForm || 0;
    result.alForm += qty.alForm || 0;
    result.formwork += qty.formwork || 0;
    result.rebar += qty.rebar || 0;
    result.concrete += qty.concrete || 0;
  }

  return result;
}

/**
 * 차감 적용된 물량 해석: base(ratio=1) - deduction → ×ratio
 *
 * tradeField에 따라 적절한 deduction 필드를 매핑:
 * - euroForm → deductions.formwork
 * - stripClean → (gangForm + alForm + formwork) * 2
 * - formwork → gangForm + alForm + formwork
 * - 나머지 → 동일 키
 */
export function resolveWithDeduction(
  building: Building,
  ref: SemanticQuantityReference,
  floorLabel: string,
  deductions: DeductionFields,
  rangeFloorId?: string
): number {
  const baseRef = { ...ref, ratio: 1 };
  let baseQuantity = 0;

  switch (baseRef.sourceType) {
    case 'category':
      baseQuantity = resolveByCategory(building, baseRef);
      break;
    case 'floor':
      baseQuantity = resolveByFloor(building, baseRef, floorLabel, rangeFloorId);
      break;
    case 'combined':
      baseQuantity = resolveByCombined(building, baseRef);
      break;
  }

  let deduction = 0;
  switch (ref.tradeField) {
    case 'euroForm':
      deduction = deductions.formwork;
      break;
    case 'stripClean':
      deduction = (deductions.gangForm + deductions.alForm + deductions.formwork) * 2;
      break;
    case 'formwork':
      deduction = deductions.gangForm + deductions.alForm + deductions.formwork;
      break;
    case 'gangForm':
      deduction = deductions.gangForm;
      break;
    case 'alForm':
      deduction = deductions.alForm;
      break;
    case 'rebar':
      deduction = deductions.rebar;
      break;
    case 'concrete':
      deduction = deductions.concrete;
      break;
  }

  return Math.max(0, baseQuantity - deduction) * ref.ratio;
}

/**
 * floor 소스 타입: 특정 층의 물량을 직접 조회
 * 기준층, 셋팅층, 옥탑층, 지하층 등에서 사용
 */
function resolveByFloor(
  building: Building,
  ref: SemanticQuantityReference,
  floorLabel?: string,
  rangeFloorId?: string
): number {
  if (!floorLabel) return 0;

  return getQuantityFromFloor(
    building,
    floorLabel,
    ref.tradeField,
    ref.subField,
    rangeFloorId,
    ref.tradeGroup
  );
}

/**
 * combined 소스 타입: 여러 층의 물량을 합산
 * 지하층(층고6.5m이상)에서 B1+B2 합산 등에 사용
 */
function resolveByCombined(
  building: Building,
  ref: SemanticQuantityReference
): number {
  if (!ref.combineFloors || ref.combineFloors.length === 0) return 0;

  let total = 0;
  for (const floor of ref.combineFloors) {
    total += getQuantityFromFloor(
      building,
      floor,
      ref.tradeField,
      ref.subField,
      undefined,
      ref.tradeGroup
    );
  }

  return total;
}
