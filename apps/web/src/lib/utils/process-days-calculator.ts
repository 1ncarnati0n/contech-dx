import type { Building, ProcessCategory } from '@/lib/types';
import type { ProcessModule } from '@/lib/data/process-modules';
import { getQuantityByReference } from './quantity-reference';
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

    // 1. Fixed work days (highest priority)
    if (item.directWorkDays !== undefined) {
      directWorkDays = item.directWorkDays;
    }
    // 2. Equipment-based calculation
    else if (
      item.equipmentCalculationBase !== undefined &&
      item.equipmentWorkersPerUnit !== undefined &&
      item.quantityReference
    ) {
      const quantity = getQuantityByReference(building, item.quantityReference);
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
      }
    }
    // 3. Quantity-based calculation (standard case)
    else if (item.quantityReference && item.dailyProductivity > 0) {
      const quantity = getQuantityByReference(building, item.quantityReference);
      if (quantity > 0) {
        const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
        const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
        directWorkDays = calculateWorkDaysWithRounding(
          quantity,
          item.dailyProductivity,
          dailyInputWorkers
        );
      }
    }

    totalDays += directWorkDays;
  }

  return Math.floor(totalDays);
}

/**
 * 층별 계산을 위한 특수 버전 (BasementProcessPlanPage용)
 *
 * @param building - The building with floor data
 * @param module - The process module
 * @param category - Process category
 * @param floorLabel - Specific floor to calculate (e.g., "B1", "B2")
 * @returns Work days for the specified floor
 *
 * @todo Implement floor-specific filtering when needed for basement calculations
 */
export function calculateModuleWorkDaysForFloor(
  building: Building,
  module: ProcessModule,
  category: ProcessCategory,
  floorLabel: string
): number {
  // For now, use the same logic as calculateModuleWorkDays
  // Floor-specific filtering can be added when basement page requires it
  return calculateModuleWorkDays(building, module, category);
}
