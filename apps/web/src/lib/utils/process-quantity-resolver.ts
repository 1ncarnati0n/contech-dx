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
 * @returns 해석된 물량 (ratio 적용 후)
 */
export function resolveProcessQuantity(
  building: Building,
  ref: SemanticQuantityReference,
  floorLabel?: string
): number {
  let baseQuantity = 0;

  switch (ref.sourceType) {
    case 'category':
      baseQuantity = resolveByCategory(building, ref);
      break;

    case 'floor':
      baseQuantity = resolveByFloor(building, ref, floorLabel);
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
    }
  }

  return total;
}

/**
 * floor 소스 타입: 특정 층의 물량을 직접 조회
 * 기준층, 셋팅층, 옥탑층, 지하층 등에서 사용
 */
function resolveByFloor(
  building: Building,
  ref: SemanticQuantityReference,
  floorLabel?: string
): number {
  if (!floorLabel) return 0;

  return getQuantityFromFloor(
    building,
    floorLabel,
    ref.tradeField,
    ref.subField
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
      ref.subField
    );
  }

  return total;
}
