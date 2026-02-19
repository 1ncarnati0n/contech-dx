import type { ProcessItem } from '@/lib/data/process-modules';
import {
  calculateTotalWorkers,
  calculateDailyInputWorkers,
  calculateWorkDaysWithRounding,
  calculateEquipmentCount,
  calculateDailyInputWorkersByEquipment,
} from '@/lib/utils/process-calculation';

interface CalculateItemDirectWorkDaysParams {
  item: ProcessItem;
  quantity: number;
  maxPumpCarCount?: number;
  useEquipmentFormula?: boolean;
}

/**
 * 세부공종 항목의 순작업일 계산 로직을 공통화합니다.
 */
export function calculateItemDirectWorkDays({
  item,
  quantity,
  maxPumpCarCount = 2,
  useEquipmentFormula = true,
}: CalculateItemDirectWorkDaysParams): number {
  if (item.directWorkDays !== undefined) {
    return item.directWorkDays;
  }

  if (quantity <= 0 || item.dailyProductivity <= 0) {
    return 0;
  }

  if (useEquipmentFormula && item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined) {
    const equipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase, maxPumpCarCount);
    const dailyInputWorkers = calculateDailyInputWorkersByEquipment(equipmentCount, item.equipmentWorkersPerUnit);
    if (dailyInputWorkers <= 0) {
      return 0;
    }
    return calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
  }

  if (item.quantityReference) {
    const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
    const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
    return calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
  }

  return 0;
}
