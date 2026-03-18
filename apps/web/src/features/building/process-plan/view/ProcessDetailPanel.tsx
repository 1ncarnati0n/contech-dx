'use client';

import { Info } from 'lucide-react';
import { cn } from '@/shared/utils';
import { Card } from '@/shared/components/ui';
import { ProcessItemCard } from './ProcessItemCard';
import { useProcessCalculation } from '../service/useProcessCalculation';
import type { Building, ProcessCategory, BuildingProcessPlan } from '@/shared/types';
import type { ProcessModule, ProcessItem } from '@/features/building/data/process-modules';
import type { DeductionFields } from '@/features/building/process-plan/service/process-quantity-resolver';
import type { ProcessPlanRow } from '../types';
import {
  useProcessDetailPanel,
  resolveOverriddenDays,
  resolveDeductions,
  type SpecialRowQuantities,
} from '../service/useProcessDetailPanel';

interface ProcessDetailPanelProps {
  building: Building;
  expandedRow: ProcessPlanRow | null;
  module: ProcessModule | null;
  plan: BuildingProcessPlan | undefined;
  processRows: ProcessPlanRow[];
  onDirectWorkDaysChange: (itemKey: string, value: number | null) => void;
  className?: string;
  specialRowQuantities?: { [key: string]: SpecialRowQuantities };
}

/**
 * 개별 항목의 계산 결과를 가져오는 래퍼 컴포넌트
 */
function ProcessItemWithCalculation({
  building,
  item,
  index,
  category,
  floorLabel,
  floor,
  overriddenDirectWorkDays,
  onDirectWorkDaysChange,
  isSpecialRow,
  specialRowQuantities,
  quantityDeductions,
}: {
  building: Building;
  item: ProcessItem;
  index: number;
  category: ProcessCategory;
  floorLabel?: string;
  floor?: { id: string; floorLabel: string };
  overriddenDirectWorkDays?: number;
  onDirectWorkDaysChange: (value: number | null) => void;
  isSpecialRow?: boolean;
  specialRowQuantities?: SpecialRowQuantities;
  quantityDeductions?: DeductionFields;
}) {
  const calculationResult = useProcessCalculation({
    building,
    item,
    category,
    floorLabel,
    overriddenDirectWorkDays,
    floor,
    isSpecialRow,
    specialRowQuantities,
    quantityDeductions,
  });

  return (
    <ProcessItemCard
      item={item}
      index={index}
      calculationResult={calculationResult}
      overriddenDirectWorkDays={overriddenDirectWorkDays}
      onDirectWorkDaysChange={onDirectWorkDaysChange}
    />
  );
}

/**
 * 세부공정 상세 패널 컨테이너
 * 선택된 행의 세부공종 항목들을 표시합니다.
 */
export function ProcessDetailPanel({
  building,
  expandedRow,
  module,
  plan,
  processRows,
  onDirectWorkDaysChange,
  className,
  specialRowQuantities,
}: ProcessDetailPanelProps) {
  const {
    rowInfo,
    firstStandardFloorLabel,
    filteredItems,
    currentSpecialRowQuantities,
    directWorkDaysSum,
    indirectDaysSum,
    totalWorkDaysSum,
  } = useProcessDetailPanel({
    expandedRow,
    module,
    plan,
    processRows,
    specialRowQuantities,
  });

  // 확장된 행이 없을 때
  if (!expandedRow) {
    return (
      <Card className={cn(
        'flex flex-col items-center justify-center py-12 px-4',
        'bg-zinc-50 dark:bg-zinc-900/50',
        className
      )}>
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <Info className="w-8 h-8 text-zinc-400" />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          세부공정 버튼을 클릭하여 상세 정보를 확인하세요
        </p>
      </Card>
    );
  }

  // 모듈이 없을 때
  if (!module || !module.items.length) {
    return (
      <Card className={cn(
        'flex flex-col items-center justify-center py-12 px-4',
        'bg-zinc-50 dark:bg-zinc-900/50',
        className
      )}>
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <Info className="w-8 h-8 text-zinc-400" />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          세부공정 데이터가 없습니다
        </p>
      </Card>
    );
  }

  return (
    <div className={cn('fade-in', className)}>
      {/* 작업일 합계 표시 */}
      {(directWorkDaysSum > 0 || indirectDaysSum > 0) && (
        <div className="mb-4 space-y-1">
          <div className="text-sm text-accent-600 dark:text-accent-400 font-medium">
            순작업일 합계: {directWorkDaysSum}일
          </div>
          {indirectDaysSum > 0 && (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              간접작업일 합계: {indirectDaysSum}일
            </div>
          )}
          {indirectDaysSum > 0 && (
            <div className="text-sm font-semibold text-zinc-900 dark:text-white">
              총작업일수: {totalWorkDaysSum}일
            </div>
          )}
        </div>
      )}

      {/* 세부공종 카드 목록 */}
      <div className="grid grid-cols-1 gap-4">
        {filteredItems.map((item, idx) => {
          const itemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${item.id}`;
          const overriddenDays = resolveOverriddenDays(expandedRow, item.id, plan, firstStandardFloorLabel);
          const deductions = resolveDeductions(expandedRow, rowInfo?.isSpecialRow ?? false, specialRowQuantities);

          return (
            <div
              key={item.id}
              className="slide-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <ProcessItemWithCalculation
                building={building}
                item={item}
                index={idx + 1}
                category={expandedRow.category}
                floorLabel={rowInfo?.isSpecialRow ? rowInfo.targetFloorLabel : expandedRow.floorLabel}
                floor={expandedRow.floor ? { id: expandedRow.floor.id, floorLabel: expandedRow.floor.floorLabel } : undefined}
                overriddenDirectWorkDays={overriddenDays}
                onDirectWorkDaysChange={(value) => onDirectWorkDaysChange(itemKey, value)}
                isSpecialRow={rowInfo?.isSpecialRow}
                specialRowQuantities={currentSpecialRowQuantities}
                quantityDeductions={deductions}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

ProcessDetailPanel.displayName = 'ProcessDetailPanel';
