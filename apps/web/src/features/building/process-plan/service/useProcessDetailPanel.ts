'use client';

import { useMemo } from 'react';
import type { ProcessModule, ProcessItem } from '@/features/building/data/process-modules';
import type { BuildingProcessPlan } from '@/shared/types';
import { getSpecialRowDeductions, type DeductionFields } from './process-quantity-resolver';
import type { ProcessPlanRow } from '../types';
import { isProcessItemMatchedToBuildingRow } from './processRowHelpers';

/** 특수 행 수량 데이터 타입 */
export type SpecialRowQuantities = {
  gangForm?: number;
  alForm?: number;
  formwork?: number;
  stripClean?: number;
  rebar?: number;
  concrete?: number;
};

interface ExpandedRowInfo {
  isParking: boolean;
  isFacility: boolean;
  isHighCeiling: boolean;
  isSpecialRow: boolean;
  targetFloorLabel?: string;
}

/** 확장된 행의 특수 행 여부 및 타겟 층 라벨 분석 */
export function analyzeExpandedRow(expandedRow: ProcessPlanRow): ExpandedRowInfo {
  const isParking = expandedRow.floorLabel?.includes('주차장') ?? false;
  const isFacility = expandedRow.floorLabel?.includes('3단 가시설 적용부') ?? false;
  const isHighCeiling = expandedRow.floorLabel?.includes('6.5m이상') ?? false;
  const isSpecialRow = isParking || isFacility || isHighCeiling;

  let targetFloorLabel = expandedRow.floorLabel;
  if (isSpecialRow && expandedRow.floorLabel) {
    const floorMatch = expandedRow.floorLabel.match(/^(B\d+)/);
    if (floorMatch) {
      targetFloorLabel = floorMatch[1];
    }
  }

  return { isParking, isFacility, isHighCeiling, isSpecialRow, targetFloorLabel };
}

/** 확장된 행에 해당하는 모듈 항목 필터링 */
export function filterItemsForRow(
  items: ProcessItem[],
  expandedRow: ProcessPlanRow,
  targetFloorLabel: string | undefined,
  isSpecialRow: boolean,
  firstStandardFloorLabel: string | undefined,
): ProcessItem[] {
  return items.filter((item) => {
    if (expandedRow.category === '주동 지하층') {
      if (isSpecialRow) {
        return item.floorLabel === targetFloorLabel;
      }
    }
    if (expandedRow.category === '지하주차장') {
      return item.floorLabel === targetFloorLabel;
    }

    if (expandedRow.category === '버림' || expandedRow.category === '기초') {
      if (expandedRow.floorLabel && item.floorLabel) {
        return item.floorLabel === expandedRow.floorLabel;
      }
      const hasDirectDays = item.directWorkDays !== undefined && item.directWorkDays > 0;
      const hasIndirectDays = item.indirectDays > 0;
      return hasDirectDays || hasIndirectDays;
    }

    return isProcessItemMatchedToBuildingRow(item, expandedRow, firstStandardFloorLabel);
  });
}

/** 오버라이드된 순작업일 조회 */
export function resolveOverriddenDays(
  expandedRow: ProcessPlanRow,
  itemId: string,
  plan: BuildingProcessPlan | undefined,
  firstStandardFloorLabel: string | undefined,
): number | undefined {
  if (expandedRow.category === '기준층') {
    const currentFloorKey = `기준층-${expandedRow.floorLabel}-${itemId}`;
    const overriddenDays = plan?.itemDirectWorkDaysOverrides?.[currentFloorKey];
    if (overriddenDays !== undefined) return overriddenDays;

    if (firstStandardFloorLabel) {
      const firstStandardFloorKey = `기준층-${firstStandardFloorLabel}-${itemId}`;
      return plan?.itemDirectWorkDaysOverrides?.[firstStandardFloorKey];
    }
    return undefined;
  }

  const itemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${itemId}`;
  return plan?.itemDirectWorkDaysOverrides?.[itemKey];
}

/** 순작업일 합계 계산 */
export function calculateDirectWorkDaysSum(
  filteredItems: ProcessItem[],
  expandedRow: ProcessPlanRow,
  plan: BuildingProcessPlan | undefined,
  firstStandardFloorLabel: string | undefined,
): number {
  let sum = 0;
  filteredItems.forEach((item) => {
    const overriddenDays = resolveOverriddenDays(expandedRow, item.id, plan, firstStandardFloorLabel);

    if (overriddenDays !== undefined) {
      sum += overriddenDays;
    } else if (item.directWorkDays !== undefined) {
      sum += item.directWorkDays;
    }
  });
  return Math.floor(sum);
}

/** 간접작업일 합계 계산 */
export function calculateIndirectDaysSum(filteredItems: ProcessItem[]): number {
  return Math.ceil(filteredItems.reduce((sum, item) => sum + item.indirectDays, 0));
}

/** 항목의 공제값 조회 */
export function resolveDeductions(
  expandedRow: ProcessPlanRow,
  isSpecialRow: boolean,
  specialRowQuantities?: { [key: string]: SpecialRowQuantities },
): DeductionFields | undefined {
  if (expandedRow.category === '주동 지하층' && !isSpecialRow && expandedRow.floorLabel) {
    return getSpecialRowDeductions(specialRowQuantities, expandedRow.floorLabel);
  }
  return undefined;
}

interface UseProcessDetailPanelOptions {
  expandedRow: ProcessPlanRow | null;
  module: ProcessModule | null;
  plan: BuildingProcessPlan | undefined;
  processRows: ProcessPlanRow[];
  specialRowQuantities?: { [key: string]: SpecialRowQuantities };
}

export function useProcessDetailPanel({
  expandedRow,
  module,
  plan,
  processRows,
  specialRowQuantities,
}: UseProcessDetailPanelOptions) {
  const rowInfo = useMemo(() => {
    if (!expandedRow) return null;
    return analyzeExpandedRow(expandedRow);
  }, [expandedRow]);

  const firstStandardFloorLabel = useMemo(() => {
    return processRows.find((r) => r.category === '기준층' && r.floorLabel)?.floorLabel;
  }, [processRows]);

  const filteredItems = useMemo(() => {
    if (!expandedRow || !module || !module.items.length || !rowInfo) return [];
    return filterItemsForRow(
      module.items,
      expandedRow,
      rowInfo.targetFloorLabel,
      rowInfo.isSpecialRow,
      firstStandardFloorLabel,
    );
  }, [expandedRow, module, rowInfo, firstStandardFloorLabel]);

  const currentSpecialRowQuantities = useMemo(() => {
    if (!rowInfo?.isSpecialRow || !expandedRow?.floorLabel) return undefined;
    return specialRowQuantities?.[expandedRow.floorLabel];
  }, [rowInfo, expandedRow, specialRowQuantities]);

  const directWorkDaysSum = useMemo(() => {
    if (!expandedRow || filteredItems.length === 0) return 0;
    return calculateDirectWorkDaysSum(filteredItems, expandedRow, plan, firstStandardFloorLabel);
  }, [filteredItems, expandedRow, plan, firstStandardFloorLabel]);

  const indirectDaysSum = useMemo(() => {
    return calculateIndirectDaysSum(filteredItems);
  }, [filteredItems]);

  const totalWorkDaysSum = directWorkDaysSum + indirectDaysSum;

  return {
    rowInfo,
    firstStandardFloorLabel,
    filteredItems,
    currentSpecialRowQuantities,
    directWorkDaysSum,
    indirectDaysSum,
    totalWorkDaysSum,
  };
}
