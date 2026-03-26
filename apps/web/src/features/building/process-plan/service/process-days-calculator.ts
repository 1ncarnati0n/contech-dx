import type { Building, ProcessCategory } from '@/shared/types';
import type { ProcessModule } from '@/features/building/data/process-modules';
import { getQuantityByReference, getQuantityFromFloor } from './quantity-reference';
import { resolveProcessQuantity } from './process-quantity-resolver';
import { parseLegacyReference } from './quantity-reference-migration';
import {
  calculateTotalWorkers,
  calculateDailyInputWorkers,
  calculateWorkDaysWithRounding,
  calculateEquipmentCount,
  calculateDailyInputWorkersByEquipment,
} from './process-calculation';

/**
 * 공정 모듈의 총 작업일수 계산 (중복 로직 통합)
 *
 * 🎯 Purpose: Consolidates 6 duplicate calculation blocks across BuildingProcessPlanPage
 * and BasementProcessPlanPage into a single, reusable utility function.
 *
 * 📍 Used in:
 * - BuildingProcessPlanPage useEffect (automatic calculation on quantity changes)
 * - handleProcessTypeChange (when user changes process type)
 * - calculate*FloorDays functions (floor-specific calculations)
 *
 * 💡 Calculation Logic:
 * 1. Fixed work days: Use item.directWorkDays directly
 * 2. Equipment-based: Calculate equipment count → daily workers → work days
 * 3. Quantity-based: Calculate total workers → daily workers → work days
 *
 * @param building - The building containing floor trades and quantities
 * @param module - The process module with items to calculate
 * @param category - The process category (for context, not currently used in logic)
 * @returns Total work days for all items in the module (floored to integer)
 *
 * @example
 * const module = getProcessModule('기준층', '6일 사이클');
 * const days = calculateModuleWorkDays(building, module, '기준층');
 * // returns: 36 (6 days × 6 floors)
 */
export function calculateModuleWorkDays(
  building: Building,
  module: ProcessModule,
  category: ProcessCategory
): number {
  if (!module || module.items.length === 0) return 0;

  let totalDays = 0;

  for (const item of module.items) {
    let directWorkDays = 0;

    // 물량 해석: quantityRef(신규) 우선, 없으면 parseLegacyReference로 변환
    const ref = item.quantityRef ?? parseLegacyReference(item.quantityReference, category);
    const quantity = ref ? resolveProcessQuantity(building, ref) : 0;

    // 물량 기반 항목 여부 판별
    const isQuantityBased = item.quantityReference || item.quantityRef || item.equipmentCalculationBase !== undefined;

    // 1. Fixed work days (highest priority)
    if (item.directWorkDays !== undefined) {
      directWorkDays = item.directWorkDays;
    }
    // 2. Equipment-based calculation
    else if (
      item.equipmentCalculationBase !== undefined &&
      item.equipmentWorkersPerUnit !== undefined &&
      (item.quantityRef || item.quantityReference)
    ) {
      if (quantity > 0 && item.dailyProductivity > 0) {
        const maxPumpCarCount = building.meta?.pumpCarCount || 2;
        const equipmentCount = calculateEquipmentCount(
          quantity,
          item.equipmentCalculationBase,
          maxPumpCarCount
        );
        const dailyInputWorkers = calculateDailyInputWorkersByEquipment(
          equipmentCount,
          item.equipmentWorkersPerUnit
        );
        if (dailyInputWorkers > 0) {
          directWorkDays = calculateWorkDaysWithRounding(
            quantity,
            item.dailyProductivity,
            dailyInputWorkers
          );
        }
      } else if (isQuantityBased) {
        directWorkDays = 1;
      }
    }
    // 3. Quantity-based calculation (standard case)
    else if ((item.quantityRef || item.quantityReference) && item.dailyProductivity > 0) {
      if (quantity > 0) {
        const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
        const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
        directWorkDays = calculateWorkDaysWithRounding(
          quantity,
          item.dailyProductivity,
          dailyInputWorkers
        );
      } else {
        directWorkDays = 1;
      }
    }
    // 4. 물량 기반이지만 위 조건에 안 걸린 경우도 최소 1일
    else if (isQuantityBased) {
      directWorkDays = 1;
    }

    totalDays += directWorkDays + item.indirectDays;
  }

  // 비즈니스 정책: 보수적 추정 (사용자 확정)
  // 모듈 총일수는 항목별 합산 이상이어야 함
  // Math.ceil 사용으로 다른 계산 함수들과 일관성 유지
  return Math.ceil(totalDays);
}

/**
 * 층별 공정 모듈 작업일수 계산
 *
 * 카테고리별로 다른 물량 해석(quantity resolution) 전략을 적용:
 * - 주동 지하층: item.floorLabel로 필터링, quantityReference 직접 사용
 * - 옥탑층: 옥탑N 패턴 필터링, 행번호를 25+phNum으로 매핑
 * - 기준층/최상층: 전체 항목 사용, getQuantityFromFloor로 층별 물량 직접 조회
 * - 셋팅층/일반층: 전체 항목 사용, 행번호를 floorNum+10으로 매핑
 *
 * @param building - 동 정보
 * @param module - 공정 모듈
 * @param category - 공정 구분
 * @param floorLabel - 대상 층 (예: "B1", "3F", "옥탑1")
 * @returns 해당 층의 작업일수
 */
export function calculateModuleWorkDaysForFloor(
  building: Building,
  module: ProcessModule,
  category: ProcessCategory,
  floorLabel: string
): number {
  if (!module || module.items.length === 0) return 0;

  // 1. 카테고리별 항목 필터링
  const items = filterItemsForFloor(module.items, category, floorLabel);

  let totalDays = 0;

  for (const item of items) {
    let directWorkDays = 0;

    // 2. 층별 물량 해석
    const quantity = resolveFloorQuantity(building, item, category, floorLabel);

    // 물량 기반 항목 여부 판별
    const isQuantityBased = item.quantityReference || item.quantityRef || item.equipmentCalculationBase !== undefined;

    // 3. 일수 계산 (calculateModuleWorkDays와 동일한 로직)
    if (item.directWorkDays !== undefined) {
      directWorkDays = item.directWorkDays;
    } else if (
      item.equipmentCalculationBase !== undefined &&
      item.equipmentWorkersPerUnit !== undefined &&
      item.quantityReference
    ) {
      if (quantity > 0 && item.dailyProductivity > 0) {
        const maxPumpCarCount = building.meta?.pumpCarCount || 2;
        const equipCount = calculateEquipmentCount(
          quantity,
          item.equipmentCalculationBase,
          maxPumpCarCount
        );
        const dailyInputWorkers = calculateDailyInputWorkersByEquipment(
          equipCount,
          item.equipmentWorkersPerUnit
        );
        if (dailyInputWorkers > 0) {
          directWorkDays = calculateWorkDaysWithRounding(
            quantity,
            item.dailyProductivity,
            dailyInputWorkers
          );
        }
      } else if (isQuantityBased) {
        directWorkDays = 1;
      }
    } else if (item.quantityReference && item.dailyProductivity > 0) {
      if (quantity > 0) {
        const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
        const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
        directWorkDays = calculateWorkDaysWithRounding(
          quantity,
          item.dailyProductivity,
          dailyInputWorkers
        );
      } else {
        directWorkDays = 1;
      }
    } else if (isQuantityBased) {
      directWorkDays = 1;
    }

    totalDays += directWorkDays + item.indirectDays;
  }

  return Math.floor(totalDays);
}

/**
 * 층별 공정 모듈의 간접작업일 합계 계산
 *
 * calculateModuleWorkDaysForFloor와 동일한 필터링 로직을 사용하되,
 * directWorkDays 대신 indirectDays만 합산합니다.
 *
 * @param module - 공정 모듈
 * @param category - 공정 구분
 * @param floorLabel - 대상 층 (예: "B1", "3F", "옥탑1")
 * @returns 해당 층의 간접작업일 합계
 */
export function calculateModuleIndirectDaysForFloor(
  module: ProcessModule,
  category: ProcessCategory,
  floorLabel: string
): number {
  if (!module || module.items.length === 0) return 0;

  const items = filterItemsForFloor(module.items, category, floorLabel);
  let totalIndirectDays = 0;

  for (const item of items) {
    totalIndirectDays += item.indirectDays;
  }

  return Math.ceil(totalIndirectDays);
}

/**
 * 공정 모듈의 간접작업일 합계 계산 (non-floor 버전)
 *
 * 버림/기초 등 floorLabel이 없는 카테고리용.
 * 전체 module.items의 indirectDays를 합산합니다.
 *
 * @param module - 공정 모듈
 * @returns 간접작업일 합계
 */
export function calculateModuleIndirectDays(
  module: ProcessModule
): number {
  if (!module || module.items.length === 0) return 0;

  let totalIndirectDays = 0;

  for (const item of module.items) {
    totalIndirectDays += item.indirectDays;
  }

  return Math.ceil(totalIndirectDays);
}

/** 카테고리별 항목 필터링 */
export function filterItemsForFloor(
  items: ProcessModule['items'],
  category: ProcessCategory,
  floorLabel: string
): ProcessModule['items'] {
  if (category === '주동 지하층' || category === '지하주차장') {
    // 지하층/지하주차장: floorLabel 일치 항목만
    return items.filter(item => item.floorLabel === floorLabel);
  }

  if (category === '옥탑층') {
    // 옥탑층: 옥탑N 패턴 매칭 또는 floorLabel 없는 항목
    return items.filter(item => {
      if (item.floorLabel) {
        const itemMatch = item.floorLabel.match(/옥탑(\d+)/);
        const targetMatch = floorLabel.match(/옥탑(\d+)/);
        if (itemMatch && targetMatch) return itemMatch[1] === targetMatch[1];
        return item.floorLabel === floorLabel;
      }
      return true;
    });
  }

  // 기준층, 셋팅층 등: 모든 항목 사용
  return items;
}

/** 카테고리별 층 물량 해석 (통합 resolver 사용) */
export function resolveFloorQuantity(
  building: Building,
  item: ProcessModule['items'][0],
  category: ProcessCategory,
  floorLabel: string
): number {
  // quantityRef(신규)가 있으면 통합 resolver 사용
  if (item.quantityRef) {
    return resolveProcessQuantity(building, item.quantityRef, floorLabel);
  }

  // 레거시 fallback: quantityReference 기반 해석 (기존 로직 유지)
  if (!item.quantityReference) return 0;

  // 주동 지하층: quantityReference 그대로 사용
  if (category === '주동 지하층') {
    return getQuantityByReference(building, item.quantityReference);
  }

  // 기준층/최상층: getQuantityFromFloor로 직접 조회
  if (category === '기준층' || category === '최상층') {
    return resolveByFloorDirectLookup(building, item.quantityReference, floorLabel);
  }

  // 옥탑층: 행번호를 25+phNum으로 매핑
  if (category === '옥탑층') {
    return resolveByRowMapping(building, item.quantityReference, floorLabel, 'ph');
  }

  // 셋팅층/일반층: 행번호를 floorNum+10으로 매핑
  if (category === '셋팅층' || category === '일반층') {
    return resolveByRowMapping(building, item.quantityReference, floorLabel, 'setting');
  }

  // 기타 (버림, 기초 등): 그대로
  return getQuantityByReference(building, item.quantityReference);
}

/** 기준층: 컬럼→필드 변환 후 getQuantityFromFloor 직접 조회 */
function resolveByFloorDirectLookup(
  building: Building,
  reference: string,
  floorLabel: string
): number {
  const refMatch = reference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
  if (!refMatch) return getQuantityByReference(building, reference);

  const [, col, , ratioStr] = refMatch;
  const ratio = ratioStr ? parseFloat(ratioStr) : 1;

  const fieldMap: Record<string, { field: 'gangForm' | 'alForm' | 'formwork' | 'stripClean' | 'rebar' | 'concrete'; subField: string }> = {
    B: { field: 'gangForm', subField: 'areaM2' },
    C: { field: 'alForm', subField: 'areaM2' },
    D: { field: 'formwork', subField: 'areaM2' },
    E: { field: 'stripClean', subField: 'areaM2' },
    F: { field: 'rebar', subField: 'ton' },
    G: { field: 'concrete', subField: 'volumeM3' },
  };

  const mapping = fieldMap[col];
  if (!mapping) return getQuantityByReference(building, reference);

  return getQuantityFromFloor(building, floorLabel, mapping.field, mapping.subField) * ratio;
}

/** 옥탑층/셋팅층: 행번호 재매핑 후 getQuantityByReference */
function resolveByRowMapping(
  building: Building,
  reference: string,
  floorLabel: string,
  mode: 'ph' | 'setting'
): number {
  const refMatch = reference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
  if (!refMatch) return getQuantityByReference(building, reference);

  const [, col, , ratioStr] = refMatch;

  let targetRowNum: number | null = null;

  if (mode === 'ph') {
    const phMatch = floorLabel.match(/옥탑(\d+)/);
    if (phMatch) {
      targetRowNum = 25 + parseInt(phMatch[1], 10); // 옥탑1 -> 26, 옥탑2 -> 27
    }
  } else {
    const floorMatch = floorLabel.match(/(\d+)F/);
    if (floorMatch) {
      targetRowNum = parseInt(floorMatch[1], 10) + 10; // 1층 -> 11, 2층 -> 12
    }
  }

  if (targetRowNum === null) return getQuantityByReference(building, reference);

  const newReference = `${col}${targetRowNum}${ratioStr ? `*${ratioStr}` : ''}`;
  return getQuantityByReference(building, newReference);
}
