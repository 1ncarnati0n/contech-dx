/**
 * 공정 일수 계산 유틸리티
 * 엑셀의 "골조표준공정 일수고정 산식표" 수식을 JavaScript로 구현
 */

/**
 * 총 작업인원 계산 (수량 / 인당 1일 작업량, 올림)
 */
export function calculateTotalWorkers(quantity: number, dailyProductivity: number): number {
  if (dailyProductivity === 0) return 0;
  return Math.ceil(quantity / dailyProductivity);
}

/**
 * 1일 투입인원 계산 (총작업인원 / 장비대수, 올림)
 */
export function calculateDailyInputWorkers(totalWorkers: number, equipmentCount: number): number {
  if (equipmentCount === 0) return 0;
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
  if (dailyProductivity === 0 || dailyInputWorkers === 0) return 1;
  
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
 * 장비대수 계산 (CEILING(MIN(2, 수량/대당타설량), 1))
 */
export function calculateEquipmentCount(
  quantity: number,
  equipmentCalculationBase: number
): number {
  if (equipmentCalculationBase === 0) return 1;
  const ratio = quantity / equipmentCalculationBase;
  return Math.max(1, Math.ceil(Math.min(2, ratio)));
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


