/**
 * 공정 일수 계산 유틸리티
 * 엑셀의 "골조표준공정 일수고정 산식표" 수식을 JavaScript로 구현
 */

import { logger } from '@/shared/utils/logger';

/**
 * 총 작업인원 계산 (수량 / 인당 1일 작업량, 올림)
 */
export function calculateTotalWorkers(quantity: number, dailyProductivity: number): number {
  if (dailyProductivity === 0) {
    logger.debug('[calculateTotalWorkers] Zero productivity', { quantity });
    return 0;
  }
  return Math.ceil(quantity / dailyProductivity);
}

/**
 * 1일 투입인원 계산 (총작업인원 / 장비대수, 올림)
 */
export function calculateDailyInputWorkers(totalWorkers: number, equipmentCount: number): number {
  if (equipmentCount === 0) {
    logger.debug('[calculateDailyInputWorkers] Zero equipment count', { totalWorkers });
    return 0;
  }
  return Math.ceil(totalWorkers / equipmentCount);
}

/**
 * 총작업일수 계산 (직영 순작업일 + 간접일, 올림)
 */
export function calculateTotalWorkDays(directWorkDays: number, indirectDays: number): number {
  return Math.ceil(directWorkDays + indirectDays);
}

/**
 * 복잡한 반올림 로직 (엑셀의 K열 수식과 동일)
 * 소수점이 0.5 미만이면 내림, 이상이면 올림, 최소값 1
 */
export function calculateWorkDaysWithRounding(
  quantity: number,
  dailyProductivity: number,
  dailyInputWorkers: number
): number {
  if (dailyProductivity === 0 || dailyInputWorkers === 0) {
    logger.debug('[calculateWorkDaysWithRounding] Zero input', {
      quantity,
      dailyProductivity,
      dailyInputWorkers
    });
    return 1;
  }
  
  const result = quantity / (dailyProductivity * dailyInputWorkers);
  const decimal = result - Math.floor(result);
  
  if (decimal < 0.5) {
    return Math.max(1, Math.floor(result));
  } else {
    return Math.max(1, Math.ceil(result));
  }
}

/**
 * CEILING 함수 (최소값 제한)
 */
export function ceiling(value: number, minValue: number = 1): number {
  return Math.max(minValue, Math.ceil(value));
}

/**
 * MIN 함수
 */
export function min(...values: number[]): number {
  return Math.min(...values);
}

/**
 * MAX 함수
 */
export function max(...values: number[]): number {
  return Math.max(...values);
}

/**
 * ROUNDUP 함수
 */
export function roundUp(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.ceil(value * factor) / factor;
}

/**
 * ROUNDDOWN 함수
 */
export function roundDown(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.floor(value * factor) / factor;
}

/**
 * 장비대수 계산 (CEILING(MIN(최대값, 수량/대당타설량), 1))
 * @param quantity 수량
 * @param equipmentCalculationBase 대당 타설량 기준값
 * @param maxCount 최대 장비 대수 (기본값: 2, 동별공정계획표의 펌프카 최대 투입대수 사용)
 */
export function calculateEquipmentCount(
  quantity: number,
  equipmentCalculationBase: number,
  maxCount: number = 2
): number {
  if (equipmentCalculationBase === 0) return 1;
  const ratio = quantity / equipmentCalculationBase;
  return Math.max(1, Math.ceil(Math.min(maxCount, ratio)));
}

/**
 * 장비기반 1일 투입인원 계산 (장비대수 * 인원수)
 */
export function calculateDailyInputWorkersByEquipment(
  equipmentCount: number,
  workersPerUnit: number
): number {
  return equipmentCount * workersPerUnit;
}

/**
 * 1일 투입인원 계산 (ROUNDUP(총작업인원/순작업일수, 0))
 */
export function calculateDailyInputWorkersByWorkDays(
  totalWorkers: number,
  directWorkDays: number
): number {
  if (directWorkDays === 0) return 0;
  return Math.ceil(totalWorkers / directWorkDays);
}

/**
 * 간접공사 인원 계산 (직영 인원 * 비율, 올림)
 * @param directWorkers 직영 1일 투입인원
 * @param ratio 간접공사 비율 (기본값: 0.3 = 30%)
 */
export function calculateIndirectWorkers(
  directWorkers: number,
  ratio: number = 0.3
): number {
  if (directWorkers === 0) return 0;
  return Math.ceil(directWorkers * ratio);
}

/**
 * 간접공사 장비 계산 (직영 장비 * 비율, 올림)
 * @param directEquipment 직영 장비대수
 * @param ratio 간접공사 비율 (기본값: 0.3 = 30%)
 */
export function calculateIndirectEquipment(
  directEquipment: number,
  ratio: number = 0.3
): number {
  if (directEquipment === 0) return 0;
  return Math.ceil(directEquipment * ratio);
}


