import { useMemo } from 'react';
import type { Building, ProcessCategory, ProcessType } from '@/lib/types';
import type { ProcessItem } from '@/lib/data/process-modules';
import type { FormulaStep, CalculationResult } from '../FormulaDisplay';
import { getQuantityByReference, getQuantityFromFloor } from '@/lib/utils/quantity-reference';
import {
  calculateTotalWorkers,
  calculateDailyInputWorkers,
  calculateWorkDaysWithRounding,
  calculateEquipmentCount,
  calculateDailyInputWorkersByEquipment,
  calculateDailyInputWorkersByWorkDays,
  calculateTotalWorkDays,
} from '@/lib/utils/process-calculation';

/**
 * 물량 참조 패턴에서 데이터 출처 설명을 생성합니다.
 */
function getQuantitySourceDescription(reference: string): string {
  const match = reference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
  if (!match) return reference;

  const [, col, row, ratio] = match;
  const rowNum = parseInt(row, 10);

  // 열 이름 매핑
  const columnNames: Record<string, string> = {
    B: '갱폼',
    C: '알폼',
    D: '형틀',
    E: '해체/정리',
    F: '철근',
    G: '콘크리트',
  };

  // 행 이름 매핑
  let rowName = '';
  if (rowNum === 6) rowName = '버림';
  else if (rowNum === 7) rowName = '기초';
  else if (rowNum === 8) rowName = 'B2';
  else if (rowNum === 9) rowName = 'B1';
  else if (rowNum >= 11 && rowNum <= 25) rowName = `${rowNum - 10}F`;
  else if (rowNum === 26) rowName = 'PH1';
  else if (rowNum === 27) rowName = 'PH2';
  else if (rowNum === 28) rowName = 'PH3';

  const colName = columnNames[col] || col;
  const ratioStr = ratio ? ` × ${ratio}` : '';

  return `물량입력표 ${col}${row} (${rowName} ${colName})${ratioStr}`;
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
}: UseProcessCalculationParams): CalculationResult {
  return useMemo(() => {
    const formulaSteps: FormulaStep[] = [];
    let stepNumber = 1;

    // 1. 수량 계산
    let quantity = 0;
    let quantitySource = '';

    if (item.quantityReference) {
      quantitySource = getQuantitySourceDescription(item.quantityReference);

      // 카테고리별 수량 가져오기 로직
      if (category === '지하층' && floorLabel) {
        const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
        if (refMatch) {
          const [, col] = refMatch;
          const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;

          // 특수 행(주차장, 3단 가시설)인 경우 specialRowQuantities에서 수량 가져오기
          if (isSpecialRow && specialRowQuantities) {
            if (col === 'B') {
              quantity = (specialRowQuantities.gangForm || 0) * ratio;
            } else if (col === 'C') {
              quantity = (specialRowQuantities.alForm || 0) * ratio;
            } else if (col === 'D') {
              quantity = (specialRowQuantities.formwork || 0) * ratio;
            } else if (col === 'E') {
              quantity = (specialRowQuantities.stripClean || 0) * ratio;
            } else if (col === 'F') {
              quantity = (specialRowQuantities.rebar || 0) * ratio;
            } else if (col === 'G') {
              quantity = (specialRowQuantities.concrete || 0) * ratio;
            }
            quantitySource = `특수행 수량 (${col === 'F' ? '철근' : col === 'G' ? '콘크리트' : '형틀'})${ratio !== 1 ? ` × ${ratio}` : ''}`;
          } else {
            // 일반 지하층인 경우 기존 로직 사용
            const field = col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete';
            const subField = col === 'B' || col === 'C' || col === 'D' || col === 'E' ? 'areaM2' : col === 'F' ? 'ton' : 'volumeM3';
            quantity = getQuantityFromFloor(building, floorLabel, field, subField) * ratio;
            quantitySource = `물량입력표 ${floorLabel} (${col === 'F' ? '철근' : col === 'G' ? '콘크리트' : '형틀'})${ratio !== 1 ? ` × ${ratio}` : ''}`;
          }
        }
      } else if ((category === '옥탑층' || category === 'PH층') && floorLabel) {
        const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
        if (refMatch) {
          const [, col] = refMatch;
          const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;
          const field = col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete';
          const subField = col === 'B' || col === 'C' || col === 'D' || col === 'E' ? 'areaM2' : col === 'F' ? 'ton' : 'volumeM3';
          quantity = getQuantityFromFloor(building, floorLabel, field, subField) * ratio;
          quantitySource = `물량입력표 ${floorLabel} (${col === 'F' ? '철근' : col === 'G' ? '콘크리트' : '형틀'})${ratio !== 1 ? ` × ${ratio}` : ''}`;
        }
      } else if (category === '기준층' && floorLabel) {
        const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
        if (refMatch) {
          const [, col] = refMatch;
          const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;
          const rangeFloorId = floor?.floorLabel?.includes('~') ? floor.id : undefined;
          const field = col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete';
          const subField = col === 'B' || col === 'C' || col === 'D' || col === 'E' ? 'areaM2' : col === 'F' ? 'ton' : 'volumeM3';
          quantity = getQuantityFromFloor(building, floorLabel, field, subField, rangeFloorId) * ratio;
          quantitySource = `물량입력표 ${floorLabel} (${col === 'F' ? '철근' : col === 'G' ? '콘크리트' : '형틀'})${ratio !== 1 ? ` × ${ratio}` : ''}`;
        }
      } else if (category === '셋팅층' && floorLabel) {
        const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
        if (refMatch) {
          const [, col] = refMatch;
          const floorMatch = floorLabel.match(/(\d+)F/);
          if (floorMatch) {
            const floorNum = parseInt(floorMatch[1], 10);
            const targetRowNum = floorNum + 10;
            const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
            quantity = getQuantityByReference(building, newReference);
            quantitySource = getQuantitySourceDescription(newReference);
          }
        }
      } else {
        quantity = getQuantityByReference(building, item.quantityReference);
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
  }, [building, item, category, floorLabel, overriddenDirectWorkDays, floor, isSpecialRow, specialRowQuantities]);
}
