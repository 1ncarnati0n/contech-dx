import { useMemo } from 'react';
import type { Building, ProcessCategory, ProcessType } from '@/lib/types';
import type { ProcessItem } from '@/lib/data/process-modules';
import type { FormulaStep, CalculationResult } from '../FormulaDisplay';
import { resolveProcessQuantity, resolveWithDeduction, type DeductionFields } from '@/lib/utils/process-quantity-resolver';
import { parseLegacyReference } from '@/lib/utils/quantity-reference-migration';
import { TRADE_FIELD_MAP } from '@/lib/types/process-quantity';
import {
  calculateTotalWorkers,
  calculateDailyInputWorkers,
  calculateWorkDaysWithRounding,
  calculateEquipmentCount,
  calculateDailyInputWorkersByEquipment,
  calculateDailyInputWorkersByWorkDays,
  calculateTotalWorkDays,
} from '@/lib/utils/process-calculation';
import { getCellReferenceForRow, type ColumnType } from '@/lib/utils/process-cell-reference';

/** 공종 필드 → 한국어 이름 */
const TRADE_FIELD_NAMES: Record<string, string> = {
  gangForm: '갱폼',
  alForm: '알폼',
  formwork: '형틀',
  euroForm: '유로폼',
  stripClean: '해체/정리',
  rebar: '철근',
  concrete: '콘크리트',
};

/** tradeField → ColumnType 변환 (formwork → formworkTotal, 나머지는 동일) */
function toColumnType(tradeField: string): ColumnType | null {
  if (tradeField === 'formwork') return 'formworkTotal';
  const valid: ColumnType[] = ['gangForm', 'alForm', 'euroForm', 'stripClean', 'rebar', 'concrete'];
  return valid.includes(tradeField as ColumnType) ? (tradeField as ColumnType) : null;
}

/**
 * SemanticQuantityReference 기반으로 데이터 출처 설명을 생성합니다.
 */
function getQuantitySourceDescriptionFromRef(
  ref: { tradeField: string; ratio: number; sourceType: string; tradeGroup?: string; combineFloors?: string[] },
  floorLabel?: string,
  cellAddress?: string
): string {
  const fieldName = TRADE_FIELD_NAMES[ref.tradeField] || ref.tradeField;
  const ratioStr = ref.ratio !== 1 ? ` × ${ref.ratio}` : '';
  const cellStr = cellAddress ? ` [${cellAddress}]` : '';

  if (ref.sourceType === 'category' && ref.tradeGroup) {
    return `${ref.tradeGroup} (${fieldName})${ratioStr}${cellStr}`;
  }
  if (ref.sourceType === 'combined' && ref.combineFloors) {
    return `${ref.combineFloors.join('+')} 합산 (${fieldName})${ratioStr}${cellStr}`;
  }
  if (floorLabel) {
    return `${floorLabel} (${fieldName})${ratioStr}${cellStr}`;
  }
  return `(${fieldName})${ratioStr}${cellStr}`;
}

interface UseProcessCalculationParams {
  building: Building;
  item: ProcessItem;
  category: ProcessCategory;
  floorLabel?: string;
  overriddenDirectWorkDays?: number;
  floor?: { id: string; floorLabel: string };
  /** 특수 행(주차장, 3단 가시설 적용부) 여부 */
  isSpecialRow?: boolean;
  /** 특수 행의 수량 데이터 (지하층 주차장/3단 가시설 전용) */
  specialRowQuantities?: {
    gangForm?: number;
    alForm?: number;
    formwork?: number;
    stripClean?: number;
    rebar?: number;
    concrete?: number;
  };
  /** 주동 지하층용: 주차장/가시설/6.5m이상 차감 합계 */
  quantityDeductions?: DeductionFields;
}

/**
 * 세부공종 항목의 계산 결과와 산식 단계를 반환하는 훅
 */
export function useProcessCalculation({
  building,
  item,
  category,
  floorLabel,
  overriddenDirectWorkDays,
  floor,
  isSpecialRow,
  specialRowQuantities,
  quantityDeductions,
}: UseProcessCalculationParams): CalculationResult {
  return useMemo(() => {
    const formulaSteps: FormulaStep[] = [];
    let stepNumber = 1;

    // 1. 수량 계산
    let quantity = 0;
    let quantitySource = '';

    // 옥탑층 셀 주소 계산을 위한 최대 지상층 번호
    const maxFloorNumber = building.floors
      ? (() => {
          const aboveGroundFloors = building.floors
            .filter(f => f.levelType === '지상' && f.floorClass !== '옥탑층')
            .map(f => {
              const rangeMatch = f.floorLabel.match(/(\d+)~(\d+)F/);
              if (rangeMatch) return parseInt(rangeMatch[2], 10);
              const match = f.floorLabel.match(/(\d+)F/);
              return match ? parseInt(match[1], 10) : f.floorNumber;
            });
          return aboveGroundFloors.length > 0 ? Math.max(...aboveGroundFloors) : undefined;
        })()
      : undefined;

    if (item.quantityReference) {
      // SemanticQuantityReference 획득: quantityRef 우선, 없으면 레거시 참조 파싱
      const ref = item.quantityRef ?? parseLegacyReference(item.quantityReference, category);

      if (ref) {
        // 특수 행(주차장, 3단 가시설)인 경우 specialRowQuantities에서 수량 가져오기
        if (isSpecialRow && specialRowQuantities) {
          let specialQty: number;
          const gf = specialRowQuantities.gangForm || 0;
          const af = specialRowQuantities.alForm || 0;
          const fw = specialRowQuantities.formwork || 0;

          if (ref.tradeField === 'formwork') {
            // D 컬럼: 형틀 합계 = 갱폼 + 알폼 + 유로폼
            specialQty = gf + af + fw;
          } else if (ref.tradeField === 'stripClean') {
            // E 컬럼: 해체/정리 = (갱폼 + 알폼 + 유로폼) × 2
            specialQty = (gf + af + fw) * 2;
          } else {
            const fieldKey = ref.tradeField === 'euroForm' ? 'formwork' : ref.tradeField;
            specialQty = (specialRowQuantities as Record<string, number | undefined>)[fieldKey] || 0;
          }

          quantity = specialQty * ref.ratio;
          const fieldName = TRADE_FIELD_NAMES[ref.tradeField] || ref.tradeField;
          quantitySource = `특수행 수량 (${fieldName})${ref.ratio !== 1 ? ` × ${ref.ratio}` : ''}`;
        } else {
          // 일반 물량 해석
          const rangeFloorId = floor?.floorLabel?.includes('~') ? floor.id : undefined;
          if (quantityDeductions) {
            // 주동 지하층: 특수 행 차감 적용
            quantity = resolveWithDeduction(building, ref, floorLabel!, quantityDeductions, rangeFloorId);
          } else {
            quantity = resolveProcessQuantity(building, ref, floorLabel, rangeFloorId);
          }

          // 셀 주소 생성
          const colType = toColumnType(ref.tradeField);
          const baseCellAddr = colType
            ? getCellReferenceForRow(category, ref.sourceType === 'category' ? undefined : floorLabel, colType, maxFloorNumber)
            : null;
          const cellAddress = baseCellAddr
            ? (ref.ratio !== 1 ? `${baseCellAddr}*${ref.ratio}` : baseCellAddr)
            : undefined;

          quantitySource = getQuantitySourceDescriptionFromRef(ref, floorLabel, cellAddress ?? undefined);
        }
      }

      // 수량 참조 단계
      if (quantity > 0 || item.quantityReference) {
        formulaSteps.push({
          stepNumber: stepNumber++,
          title: '수량 참조',
          variables: [
            {
              name: '수량',
              value: quantity,
              source: quantitySource,
            },
          ],
          result: {
            value: quantity,
            unit: item.unit,
          },
        });
      }
    }

    // 2. 계산 로직
    let directWorkDays = 0;
    let totalWorkers = 0;
    let dailyInputWorkers = 0;
    let equipmentCount: number | undefined;

    // 장비기반 계산인 경우 (타설 등)
    const isEquipmentBased = item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined;

    if (item.directWorkDays !== undefined) {
      // 고정값인 경우
      directWorkDays = item.directWorkDays;
      if (item.dailyProductivity > 0 && quantity > 0) {
        totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
        dailyInputWorkers = calculateDailyInputWorkersByWorkDays(totalWorkers, directWorkDays);
      }

      formulaSteps.push({
        stepNumber: stepNumber++,
        title: '순작업일 (고정값)',
        variables: [
          { name: '순작업일', value: directWorkDays, source: '일수고정' },
        ],
        result: { value: directWorkDays, unit: '일' },
      });

      if (item.dailyProductivity > 0 && quantity > 0) {
        formulaSteps.push({
          stepNumber: stepNumber++,
          title: '총투입인원',
          formula: `CEILING(${quantity.toFixed(2)} / ${item.dailyProductivity})`,
          variables: [
            { name: '수량', value: quantity },
            { name: '인당 생산성', value: item.dailyProductivity },
          ],
          result: { value: totalWorkers, unit: '명' },
        });

        formulaSteps.push({
          stepNumber: stepNumber++,
          title: '1일 투입인원',
          formula: `ROUNDUP(${totalWorkers} / ${directWorkDays})`,
          variables: [
            { name: '총투입인원', value: totalWorkers },
            { name: '순작업일', value: directWorkDays },
          ],
          result: { value: dailyInputWorkers, unit: '명' },
        });
      }
    } else if (isEquipmentBased) {
      // 장비대수 기반 계산 (타설 항목)
      const maxPumpCarCount = building.meta?.pumpCarCount || 2;
      equipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase!, maxPumpCarCount);
      dailyInputWorkers = calculateDailyInputWorkersByEquipment(equipmentCount, item.equipmentWorkersPerUnit!);

      if (item.dailyProductivity > 0 && dailyInputWorkers > 0 && quantity > 0) {
        directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
      }
      // 타설의 경우 총투입인원 = 1일투입인원 * 순작업일
      if (directWorkDays > 0 && dailyInputWorkers > 0) {
        totalWorkers = dailyInputWorkers * directWorkDays;
      }

      formulaSteps.push({
        stepNumber: stepNumber++,
        title: '장비대수',
        formula: `CEILING(MIN(${maxPumpCarCount}, ${quantity.toFixed(2)} / ${item.equipmentCalculationBase}), 1)`,
        variables: [
          { name: '수량', value: quantity },
          { name: '대당 타설량', value: item.equipmentCalculationBase!, source: '장비 기준값' },
          { name: '최대 펌프카', value: maxPumpCarCount, source: '동 설정' },
        ],
        result: { value: equipmentCount, unit: '대' },
      });

      formulaSteps.push({
        stepNumber: stepNumber++,
        title: '1일 투입인원',
        formula: `${equipmentCount} × ${item.equipmentWorkersPerUnit}`,
        variables: [
          { name: '장비대수', value: equipmentCount },
          { name: '장비당 인원', value: item.equipmentWorkersPerUnit!, source: item.calculationBasis },
        ],
        result: { value: dailyInputWorkers, unit: '명' },
      });

      if (quantity > 0 && item.dailyProductivity > 0) {
        formulaSteps.push({
          stepNumber: stepNumber++,
          title: '순작업일',
          formula: `ROUND(${quantity.toFixed(2)} / (${item.dailyProductivity} × ${dailyInputWorkers}))`,
          variables: [
            { name: '수량', value: quantity },
            { name: '인당 생산성', value: item.dailyProductivity },
            { name: '1일 투입인원', value: dailyInputWorkers },
          ],
          result: { value: directWorkDays, unit: '일' },
        });
      }

      formulaSteps.push({
        stepNumber: stepNumber++,
        title: '총투입인원',
        formula: `${dailyInputWorkers} × ${directWorkDays}`,
        variables: [
          { name: '1일 투입인원', value: dailyInputWorkers },
          { name: '순작업일', value: directWorkDays },
        ],
        result: { value: totalWorkers, unit: '명' },
      });
    } else if (item.dailyProductivity > 0 && quantity > 0) {
      // 일반 계산
      totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
      dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
      directWorkDays = dailyInputWorkers > 0
        ? calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers)
        : 0;

      formulaSteps.push({
        stepNumber: stepNumber++,
        title: '총투입인원',
        formula: `CEILING(${quantity.toFixed(2)} / ${item.dailyProductivity})`,
        variables: [
          { name: '수량', value: quantity },
          { name: '인당 생산성', value: item.dailyProductivity },
        ],
        result: { value: totalWorkers, unit: '명' },
      });

      formulaSteps.push({
        stepNumber: stepNumber++,
        title: '1일 투입인원',
        formula: `CEILING(${totalWorkers} / ${item.equipmentCount})`,
        variables: [
          { name: '총투입인원', value: totalWorkers },
          { name: '장비대수', value: item.equipmentCount },
        ],
        result: { value: dailyInputWorkers, unit: '명' },
      });

      formulaSteps.push({
        stepNumber: stepNumber++,
        title: '순작업일',
        formula: `ROUND(${quantity.toFixed(2)} / (${item.dailyProductivity} × ${dailyInputWorkers}))`,
        variables: [
          { name: '수량', value: quantity },
          { name: '인당 생산성', value: item.dailyProductivity },
          { name: '1일 투입인원', value: dailyInputWorkers },
        ],
        result: { value: directWorkDays, unit: '일' },
      });
    }

    // 오버라이드된 순작업일 처리
    const displayDirectWorkDays = overriddenDirectWorkDays !== undefined ? overriddenDirectWorkDays : directWorkDays;

    // 오버라이드된 경우 나머지 항목 재계산
    if (overriddenDirectWorkDays !== undefined && overriddenDirectWorkDays > 0) {
      if (isEquipmentBased) {
        const maxPumpCarCount = building.meta?.pumpCarCount || 2;
        equipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase!, maxPumpCarCount);
        dailyInputWorkers = calculateDailyInputWorkersByEquipment(equipmentCount, item.equipmentWorkersPerUnit!);
        if (dailyInputWorkers > 0) {
          totalWorkers = dailyInputWorkers * displayDirectWorkDays;
        }
      } else if (item.dailyProductivity > 0 && quantity > 0) {
        if (totalWorkers === 0) {
          totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
        }
        if (totalWorkers > 0 && displayDirectWorkDays > 0) {
          dailyInputWorkers = Math.ceil(totalWorkers / displayDirectWorkDays);
        }
      } else if (item.directWorkDays !== undefined && item.dailyProductivity > 0 && quantity > 0) {
        totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
        dailyInputWorkers = calculateDailyInputWorkersByWorkDays(totalWorkers, displayDirectWorkDays);
      }
    }

    // 총작업일수 계산
    const totalWorkDays = calculateTotalWorkDays(displayDirectWorkDays, item.indirectDays);

    // 간접작업일 단계
    if (item.indirectDays > 0) {
      formulaSteps.push({
        stepNumber: stepNumber++,
        title: '간접작업일',
        variables: [
          { name: '간접작업일', value: item.indirectDays, source: item.indirectWorkItem },
        ],
        result: { value: item.indirectDays, unit: '일' },
      });
    }

    // 총작업일수 단계
    formulaSteps.push({
      stepNumber: stepNumber++,
      title: '총작업일수',
      formula: `${displayDirectWorkDays} + ${item.indirectDays}`,
      variables: [
        { name: '순작업일', value: displayDirectWorkDays },
        { name: '간접작업일', value: item.indirectDays },
      ],
      result: { value: totalWorkDays, unit: '일' },
    });

    return {
      quantity,
      quantitySource,
      totalWorkers,
      dailyInputWorkers,
      directWorkDays: displayDirectWorkDays,
      indirectDays: item.indirectDays,
      totalWorkDays,
      equipmentCount,
      formulaSteps,
    };
  }, [building, item, category, floorLabel, overriddenDirectWorkDays, floor, isSpecialRow, specialRowQuantities, quantityDeductions]);
}
