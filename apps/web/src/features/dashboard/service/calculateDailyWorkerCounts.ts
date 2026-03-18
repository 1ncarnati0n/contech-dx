import type { Building } from '@/shared/types';
import type { TradeFieldKey, TradeSubFieldKey } from '@/shared/types/process-quantity';
import { resolveProcessQuantity } from '@/features/building/process-plan/service/process-quantity-resolver';
import {
  calculateTotalWorkers,
  calculateEquipmentCount,
  calculateDailyInputWorkersByEquipment,
} from '@/features/building/process-plan/service/process-calculation';

export interface DailyWorkerCounts {
  gangForm: number;
  alForm: number;
  formwork: number;
  rebar: number;
  concrete: number;
}

const EMPTY_COUNTS: DailyWorkerCounts = {
  gangForm: 0,
  alForm: 0,
  formwork: 0,
  rebar: 0,
  concrete: 0,
};

/** 동 배열로부터 일일 인원투입 수 계산 */
export function calculateDailyWorkerCounts(buildings: Building[]): DailyWorkerCounts {
  if (buildings.length === 0) return { ...EMPTY_COUNTS };

  const counts: DailyWorkerCounts = { ...EMPTY_COUNTS };

  buildings.forEach((building) => {
    const blindingTrades = building.floorTrades.filter((ft) => ft.tradeGroup === '버림');
    const foundationTrades = building.floorTrades.filter((ft) => ft.tradeGroup === '기초');

    const totalGangFormArea = sumTradeQuantity(building, blindingTrades, foundationTrades, 'gangForm', 'areaM2');
    if (totalGangFormArea > 0) {
      counts.gangForm += Math.ceil(calculateTotalWorkers(totalGangFormArea, 10));
    }

    const totalAlFormArea = sumTradeQuantity(building, blindingTrades, foundationTrades, 'alForm', 'areaM2');
    if (totalAlFormArea > 0) {
      counts.alForm += Math.ceil(calculateTotalWorkers(totalAlFormArea, 10));
    }

    const totalFormworkArea =
      totalGangFormArea +
      totalAlFormArea +
      sumTradeQuantity(building, blindingTrades, foundationTrades, 'formwork', 'areaM2');
    if (totalFormworkArea > 0) {
      counts.formwork += Math.ceil(calculateTotalWorkers(totalFormworkArea, 11));
    }

    const totalRebarTon = sumTradeQuantity(building, blindingTrades, foundationTrades, 'rebar', 'ton');
    if (totalRebarTon > 0) {
      counts.rebar += Math.ceil(calculateTotalWorkers(totalRebarTon, 0.8));
    }

    const totalConcreteVolume = sumTradeQuantity(building, blindingTrades, foundationTrades, 'concrete', 'volumeM3');
    if (totalConcreteVolume > 0) {
      const maxPumpCarCount = building.meta?.pumpCarCount || 2;
      const equipmentCount = calculateEquipmentCount(totalConcreteVolume, 400, maxPumpCarCount);
      counts.concrete += Math.ceil(calculateDailyInputWorkersByEquipment(equipmentCount, 6));
    }
  });

  return counts;
}

/** 특정 공종의 물량 합산 (특수층 + 일반층) */
function sumTradeQuantity(
  building: Building,
  blindingTrades: Building['floorTrades'],
  foundationTrades: Building['floorTrades'],
  tradeField: TradeFieldKey,
  subField: TradeSubFieldKey,
): number {
  let total = 0;

  blindingTrades.forEach((trade) => {
    total += (trade.trades as Record<string, Record<string, number>>)[tradeField]?.[subField] || 0;
  });
  foundationTrades.forEach((trade) => {
    total += (trade.trades as Record<string, Record<string, number>>)[tradeField]?.[subField] || 0;
  });

  building.floors.forEach((floor) => {
    if (floor.levelType === '지상' || floor.levelType === '지하') {
      const floorLabel = floor.floorLabel.replace(/코어\d+-/, '');
      total +=
        resolveProcessQuantity(
          building,
          { tradeField, subField, ratio: 1, sourceType: 'floor' },
          floorLabel,
        ) || 0;
    }
  });

  return total;
}
